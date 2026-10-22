import fs from 'node:fs';
const inputs = JSON.parse(fs.readFileSync(process.cwd() + '/.discovery.json'));
export default {
  cId: 'b8d8b3e0-5ee3-41b5-ae5e-b3d8596c7633',
  // required by eventcatalog
  tsd: 1792703994563,
  title: inputs.domain.metadata.title || inputs.domain.metadata.name,
  tagline: 'Domain architecture and authoritative API contracts',
  organizationName: inputs.organization,
  homepageLink: process.env.CATALOG_URL || inputs.resolved[0].url.replace(/\.git$/, ''),
  trailingSlash: 'always',
  output: 'server',
  mcp: {enabled: true},
  chat: {enabled: false},
};
