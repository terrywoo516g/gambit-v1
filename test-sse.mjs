import { EventSource } from 'eventsource';
const id = '14357c98-5f33-4eb6-8b6d-5eeead2508ad';
const es = new EventSource(`http://localhost:3000/api/stream/${id}`);
es.onmessage = (e) => {
  const chunk = JSON.parse(e.data);
  if (chunk.type === 'token') process.stdout.write(chunk.data);
  if (chunk.type === 'done') { console.log('\n--- done ---', chunk.data); es.close(); process.exit(0); }
  if (chunk.type === 'error') { console.error('ERROR:', chunk.data); es.close(); process.exit(1); }
};