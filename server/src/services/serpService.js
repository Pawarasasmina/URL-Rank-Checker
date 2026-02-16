const axios = require('axios');
const { buildDomainKeys, getRootDomain, tokenizeValue } = require('../utils/domain');

const SERP_URL = 'https://serpapi.com/search.json';

const uniqueById = (list) =>
  list.filter(
    (item, index, arr) =>
      arr.findIndex((x) => String(x._id) === String(item._id)) === index
  );

const enrichDomainRecord = (domainDoc) => {
  const plain = typeof domainDoc.toObject === 'function' ? domainDoc.toObject() : { ...domainDoc };
  const brandCode = plain.brand?.code || '';
  const generated = buildDomainKeys({ domain: plain.domain, brandCode });

  const domainHostKey = plain.domainHostKey || generated.domainHostKey;
  const domainRootKey = plain.domainRootKey || generated.domainRootKey || getRootDomain(domainHostKey);
  const tokens = [...new Set([...(plain.tokens || []), ...generated.tokens])].filter((token) => token.length >= 4);

  const isAliasTokenDomain = !domainHostKey.includes('.') || domainHostKey.length < 10;

  return {
    ...plain,
    domainHostKey,
    domainRootKey,
    tokens,
    isAliasTokenDomain,
  };
};

const buildLookup = (domains) => {
  const sanitized = (domains || [])
    .map(enrichDomainRecord)
    .filter((item) => item.domainHostKey && item.brand);

  const mapExactHostKey = new Map();
  const mapRootKey = new Map();
  const tokenIndex = new Map();

  const listDomainsSortedByLengthDesc = [...sanitized].sort(
    (a, b) => b.domainHostKey.length - a.domainHostKey.length
  );

  sanitized.forEach((item) => {
    mapExactHostKey.set(item.domainHostKey, item);

    if (item.domainRootKey) {
      if (!mapRootKey.has(item.domainRootKey)) {
        mapRootKey.set(item.domainRootKey, []);
      }
      mapRootKey.get(item.domainRootKey).push(item);
    }

    if (item.isAliasTokenDomain) {
      (item.tokens || []).forEach((token) => {
        if (!tokenIndex.has(token)) {
          tokenIndex.set(token, new Set());
        }
        tokenIndex.get(token).add(item.domainHostKey);
      });
    }
  });

  return {
    mapExactHostKey,
    mapRootKey,
    listDomainsSortedByLengthDesc,
    tokenIndex,
  };
};

const resolveBestMatch = (candidates) => {
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.domainHostKey.length - a.domainHostKey.length)[0];
};

const classifyResult = (resultHost, resultLink, lookup) => {
  if (!resultHost) {
    return { matchedDomain: null, matchType: 'none' };
  }

  const exact = lookup.mapExactHostKey.get(resultHost);
  if (exact) {
    return { matchedDomain: exact, matchType: 'exact' };
  }

  const suffixCandidates = [];
  lookup.listDomainsSortedByLengthDesc.forEach((domainItem) => {
    if (resultHost === domainItem.domainHostKey || resultHost.endsWith(`.${domainItem.domainHostKey}`)) {
      suffixCandidates.push(domainItem);
    }
  });

  const rootCandidates = lookup.mapRootKey.get(getRootDomain(resultHost)) || [];
  suffixCandidates.push(...rootCandidates);

  const suffix = resolveBestMatch(uniqueById(suffixCandidates));
  if (suffix) {
    return { matchedDomain: suffix, matchType: 'suffix' };
  }

  const hostTokens = new Set(tokenizeValue(resultHost));
  const tokenCandidates = [];

  hostTokens.forEach((token) => {
    if (token.length < 4) return;
    const hostSet = lookup.tokenIndex.get(token);
    if (!hostSet) return;

    hostSet.forEach((hostKey) => {
      const candidate = lookup.mapExactHostKey.get(hostKey);
      if (candidate) tokenCandidates.push(candidate);
    });
  });

  const tokenMatch = resolveBestMatch(uniqueById(tokenCandidates));
  if (tokenMatch) {
    return { matchedDomain: tokenMatch, matchType: 'token' };
  }

  return { matchedDomain: null, matchType: 'none' };
};

const fetchSerpResults = async ({ apiKey, query, gl = 'id', hl = 'id', num = 10 }) => {
  const response = await axios.get(SERP_URL, {
    params: {
      engine: 'google',
      q: query,
      gl,
      hl,
      num,
      api_key: apiKey,
    },
    timeout: 20000,
  });

  return response.data;
};

module.exports = {
  fetchSerpResults,
  buildLookup,
  classifyResult,
  enrichDomainRecord,
};
