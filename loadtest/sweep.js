import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const URL = __ENV.URL || 'http://localhost:8000/v1/chat/completions';
const genTokens = new Counter('gen_tokens'); // completion tokens; its rate = throughput

export const options = { vus: Number(__ENV.VUS || 1), duration: __ENV.DURATION || '60s' };

export default function () {
  const body = JSON.stringify({
    model: 'Qwen/Qwen2.5-0.5B-Instruct',
    // random prefix defeats vLLM's prefix cache, so every request pays the full prefill
    messages: [{ role: 'user', content: `${Math.random()} Write a short story about a GPU.` }],
    max_tokens: 128,
    ignore_eos: true, // vLLM extra parameter: always generate exactly 128 tokens
  });
  const res = http.post(URL, body, { headers: { 'Content-Type': 'application/json' }, timeout: '120s' });
  if (check(res, { 'status 200': (r) => r.status === 200 })) genTokens.add(res.json('usage.completion_tokens'));
}
