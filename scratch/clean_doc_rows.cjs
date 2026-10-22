const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const db = new DatabaseSync(path.join(__dirname, "..", "server", "data", "database.sqlite"));
const linkedIds = [
  'DOC-50F941EB', 'DOC-7BE6E6D7', 'DOC-B05FB324', 'DOC-17687663', 'DOC-5B22AAB8',
  'DOC-8B0489E8', 'DOC-D60BF865', 'DOC-9F001BC5', 'DOC-64FC149A', 'DOC-14EECA01',
  'DOC-472996F3', 'DOC-FAEB83C3', 'DOC-D8979938', 'DOC-E292647E', 'DOC-FC9C87C6',
  'DOC-8DFD89A5', 'DOC-58368D02', 'DOC-5AB001AC', 'DOC-8FA7EBB5', 'DOC-83B8EC0F',
  'DOC-21BEAF17', 'DOC-971E4176', 'DOC-08401827', 'DOC-C4400923'
];
const placeholders = linkedIds.map(() => '?').join(',');
const info = db.prepare(`DELETE FROM documents WHERE id IN (${placeholders})`).run(...linkedIds);
console.log('Deleted legacy order documents:', info.changes);
const docCount = db.prepare('SELECT COUNT(*) as c FROM documents').get().c;
console.log('Total documents remaining:', docCount);
