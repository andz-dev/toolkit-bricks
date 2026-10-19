'use strict';
// Validates profile files against the JSON Schema and the shared cross-reference rules.
// Usage: node scripts/validate-profile.js <file.json> [more files...]
// Exit code 1 when any file has errors. Warnings never fail (design rule D-5).
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const core = require('../shared/catalog-core.js');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schema', 'catalog.schema.json'), 'utf8'));

function makeSchemaValidator() {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  ajv.addKeyword('x-crossReferenceRules'); // documented in the schema, enforced by shared/catalog-core.js
  return ajv.compile(schema);
}

function checkProfile(profile, validateSchema) {
  const v = validateSchema || makeSchemaValidator();
  const schemaOk = v(profile);
  const schemaErrors = schemaOk ? [] : v.errors.map(e => (e.instancePath || '/') + ' ' + e.message);
  const r = core.validate(profile);
  return { schemaErrors, errors: r.er, warnings: r.wa, ok: schemaOk && r.er.length === 0 };
}

module.exports = { checkProfile, makeSchemaValidator, schema };

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('Usage: node scripts/validate-profile.js <file.json> [...]'); process.exit(2); }
  const v = makeSchemaValidator();
  let failed = false;
  for (const f of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) { console.error(f + ': not valid JSON (' + e.message + ')'); failed = true; continue; }
    const r = checkProfile(data, v);
    console.log((r.ok ? 'OK    ' : 'FAIL  ') + f);
    r.schemaErrors.forEach(m => console.log('  schema: ' + m));
    r.errors.forEach(m => console.log('  rule:   ' + m));
    r.warnings.forEach(m => console.log('  warn:   ' + m));
    if (!r.ok) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
