'use strict';
// Validates profile files and collections against their JSON Schemas and the shared cross-reference rules.
// A file with a "topics" list is a collection: it is validated, and so is every profile it lists (design rule D-6).
// Usage: node scripts/validate-profile.js <file.json> [more files...]
// Exit code 1 when any file has errors. Warnings never fail (design rule D-5).
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const core = require('../shared/catalog-core.js');

const schemaDir = path.join(__dirname, '..', 'schema');
const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'catalog.schema.json'), 'utf8'));
const collectionSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'collection.schema.json'), 'utf8'));

function compile(sch) {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  ajv.addKeyword('x-crossReferenceRules'); // documented in the schema, enforced by shared/catalog-core.js
  return ajv.compile(sch);
}
const makeSchemaValidator = () => compile(schema);
const makeCollectionValidator = () => compile(collectionSchema);

function checkCollection(manifest, validateColl) {
  const v = validateColl || makeCollectionValidator();
  const schemaOk = v(manifest);
  const schemaErrors = schemaOk ? [] : v.errors.map(e => (e.instancePath || '/') + ' ' + e.message);
  const r = core.validateCollection(manifest);
  return { schemaErrors, errors: r.er, warnings: r.wa, ok: schemaOk && r.er.length === 0 };
}

function checkProfile(profile, validateSchema) {
  const v = validateSchema || makeSchemaValidator();
  const schemaOk = v(profile);
  const schemaErrors = schemaOk ? [] : v.errors.map(e => (e.instancePath || '/') + ' ' + e.message);
  const r = core.validate(profile);
  return { schemaErrors, errors: r.er, warnings: r.wa, ok: schemaOk && r.er.length === 0 };
}

module.exports = { checkProfile, checkCollection, makeSchemaValidator, makeCollectionValidator, schema, collectionSchema };

function report(label, r) {
  console.log((r.ok ? 'OK    ' : 'FAIL  ') + label);
  r.schemaErrors.forEach(m => console.log('  schema: ' + m));
  r.errors.forEach(m => console.log('  rule:   ' + m));
  r.warnings.forEach(m => console.log('  warn:   ' + m));
  return r.ok;
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('Usage: node scripts/validate-profile.js <file.json> [...]'); process.exit(2); }
  const v = makeSchemaValidator();
  const vc = makeCollectionValidator();
  let failed = false;
  const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(f + ': not valid JSON (' + e.message + ')'); failed = true; return null; } };
  for (const f of files) {
    const data = read(f);
    if (!data) continue;
    if (data && Array.isArray(data.topics)) {
      if (!report(f, checkCollection(data, vc))) failed = true;
      for (const t of data.topics) {
        const pf = path.join(path.dirname(f), String(t.file));
        if (!fs.existsSync(pf)) { console.log('FAIL  ' + pf + '\n  rule:   listed in the collection but the file does not exist'); failed = true; continue; }
        const pd = read(pf);
        if (pd && !report('  ' + pf, checkProfile(pd, v))) failed = true;
      }
    } else if (!report(f, checkProfile(data, v))) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
