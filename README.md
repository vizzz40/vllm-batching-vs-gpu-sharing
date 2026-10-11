# GPU-efficient LLM serving on Kubernetes

A hands-on lab about using GPUs efficiently when serving LLMs. It serves a small model with vLLM, measures how well it uses the GPU, then shares one GPU between several workloads and measures what the sharing costs in latency.

Stack: vLLM, Kubernetes, Argo CD (GitOps), Prometheus + Grafana (vLLM and GPU metrics), k6 (load testing).

This is a learning project, not a production system. Every number in this README comes from a real run, and the hardware is listed next to it.

## Questions this lab answers

1. **One model, one GPU:** how much does vLLM's request batching raise throughput, and what does it cost in latency?
2. **Sharing one GPU:** what happens to throughput and tail latency when two model servers share a GPU (time-slicing), compared with one?
3. **Cluster level (later):** how do quotas and queueing (Kueue) and scale-to-zero (KEDA) change GPU usage?

## Hardware

- Laptop: NVIDIA RTX 4050 Laptop GPU, 6 GB (Docker on WSL2)
- Cloud (planned, not run yet): one AWS GPU node joined to a Kubernetes cluster, tainted so only GPU workloads run on it

## Progress

- [x] Docker can see the laptop GPU (`nvidia-smi` in a CUDA 12.4 container, RTX 4050 6 GB, driver 592.00)
- [x] vLLM serving a small model in Docker (laptop GPU): Qwen2.5-0.5B-Instruct, vLLM v0.31.0, KV cache 2.46 GiB (~215k tokens)
- [x] k6 load-test script with a concurrency sweep ([loadtest/sweep.js](loadtest/sweep.js))
- [x] Baseline: throughput and latency vs concurrency, one vLLM server (laptop)
- [x] Sharing: two vLLM servers on one GPU vs one (laptop)

Status: layers 1 and 2 are done on the laptop GPU. The Kubernetes and cloud GPU steps below are planned and not started.

- [ ] Local kind cluster with Argo CD, Prometheus and Grafana
- [ ] vLLM manifests for a tainted GPU node
- [ ] Cloud GPU node joined, tainted, GPU visible to Kubernetes
- [ ] vLLM deployed to the GPU node by Argo CD
- [ ] Grafana dashboard with vLLM and GPU metrics
- [ ] Baseline and sharing experiments repeated on the cloud GPU

## Results

### 1. Batching: throughput vs latency, one vLLM server (laptop)

Setup: vLLM v0.31.0 in Docker, Qwen2.5-0.5B-Instruct (bf16), `--gpu-memory-utilization 0.7`, `--max-model-len 4096`, RTX 4050 Laptop 6 GB. k6 v2.2.0 runs N virtual users (VUs) for 60 s each. Each VU sends one chat request, waits for the full answer, then sends the next. Every request generates exactly 128 tokens (`ignore_eos: true`), so all runs do the same work per request.

| VUs (requests in flight) | Throughput (tokens/s) | Requests in 60 s | p50 latency | p95 latency | Failed |
|---:|---:|---:|---:|---:|---:|
| 1  |   129 |   61 | 0.98 s | 1.06 s | 0 |
| 2  |   257 |  122 | 0.99 s | 1.03 s | 0 |
| 4  |   495 |  236 | 1.03 s | 1.05 s | 0 |
| 8  |   976 |  464 | 1.05 s | 1.08 s | 0 |
| 16 | 1,916 |  912 | 1.07 s | 1.09 s | 0 |
| 32 | 3,157 | 1,505 | 1.27 s | 1.32 s | 0 |
| 64 | 4,716 | 2,240 | 1.73 s | 1.79 s | 0 |

Throughput is generated tokens per second summed over all users. Latency is the full request time (k6 `http_req_duration`), from sending the request to receiving the last token.

What it shows:
- **Up to 16 users, batching is almost free.** Throughput grows ~15× while p95 latency rises by only 0.03 s. vLLM runs all in-flight requests in the same GPU step, and each step costs about the same whether it serves 1 request or 16.
- **Past 16 users, latency starts to pay.** At 64 users throughput is ~36× the single-user value, but each request takes 1.73 s instead of 0.98 s (~13.5 ms per token instead of ~7.7 ms). Each user gets slower tokens; the GPU produces many more in total.
- **The operating point depends on the latency target.** If the target is p95 < 1.1 s, this server should run at about 16 concurrent requests. If the target is p95 < 2 s, 64 requests give ~2.5× more throughput.

### 2. Sharing: two vLLM servers on one GPU vs one (laptop)

Setup: same model, script and GPU as above, but every server gets `--gpu-memory-utilization 0.35` (~2.1 GB, KV cache 31,424 tokens), so the only difference between runs is sharing. Two servers run as two containers on the same GPU (ports 8000 and 8001), and two k6 runs load them at the same time. With no sharing tool installed, the GPU time-slices between the two processes: it runs one, then switches to the other.

Same total load, one server vs two:

| Total users | Setup | Total throughput (tokens/s) | p50 latency | p95 latency | p99 latency | Failed |
|---:|---|---:|---:|---:|---:|---:|
| 32 | 1 server, 32 users | 3,149 | 1.30 s | 1.34 s | 1.43 s | 0 |
| 32 | 2 servers, 16 users each | 1,471 (751 + 720) | 2.69 s | 2.87 s | 3.26 s | 0 |
| 64 | 1 server, 64 users | 4,728 | 1.68 s | 1.86 s | 1.90 s | 0 |
| 64 | 2 servers, 32 users each | 2,517 (1,261 + 1,256) | 3.27 s | 3.45 s | 3.47 s | 0 |

For two servers, latency is the worse of the two servers. Sanity check: the 0.35 single server matched the 0.7 sweep above within ~1% (16 users: 1,890 vs 1,916 tokens/s), so the smaller KV cache did not limit these runs.

What it shows:
- **Sharing cost about half the throughput.** With the same users, two servers produced 47–53% fewer tokens/s than one server and roughly doubled p95 latency.
- **Two servers together made less than one server serving only half the users.** 16 + 16 users on two servers gave 1,471 tokens/s; one server with 16 users gave 1,890 tokens/s.
- **Why (likely, not yet profiled):** the two servers cannot batch together. Each one batches only its own users, and the GPU switches between the two processes instead of running one bigger batch. For a small model whose GPU steps are short, the switching and idle gaps take a large share of the time.
- **Takeaway:** time-slicing gives two workloads access to one GPU, but not more capacity. For one model, one server with a bigger batch is far more efficient than several copies. Sharing makes sense for different models with low traffic, and then memory limits must be enforced (HAMi, MIG), because nothing stops one server from taking the other's memory.

Raw k6 summaries: [loadtest/results/](loadtest/results/) (`laptop-*` = batching sweep, `share-*` = sharing test). Reproduce one point (vLLM running on port 8000):

```bash
k6 run -e VUS=16 -e DURATION=60s --summary-export loadtest/results/laptop-vus16.json loadtest/sweep.js
```
