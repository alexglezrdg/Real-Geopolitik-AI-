import { debugTopicHash } from "./src/dedupe_store.js";

const t1 = 'Kremlin warns of possible US naval blockade on Cuba';
const t2 = 'Cuba faces US naval blockade threat as Kremlin tensions escalate';
const t3 = 'Naval blockade: Kremlin applies pressure on Cuba - military escalation';

const d1 = debugTopicHash(t1);
const d2 = debugTopicHash(t2);
const d3 = debugTopicHash(t3);

console.log('Title 1:', t1);
console.log('  Hash:', d1.hash);
console.log('  Tokens:', d1.tokens);
console.log();
console.log('Title 2:', t2);
console.log('  Hash:', d2.hash);
console.log('  Tokens:', d2.tokens);
console.log();
console.log('Title 3:', t3);
console.log('  Hash:', d3.hash);
console.log('  Tokens:', d3.tokens);
console.log();
console.log('Match 1-2?', d1.hash === d2.hash);
console.log('Match 2-3?', d2.hash === d3.hash);
console.log('Match 1-3?', d1.hash === d3.hash);
