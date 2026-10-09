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
- Cloud: one AWS GPU node joined to a Kubernetes cluster, tainted so only GPU workloads run on it

## Progress

- [x] Docker can see the laptop GPU (`nvidia-smi` in a CUDA 12.4 container, RTX 4050 6 GB, driver 592.00)
- [ ] vLLM serving a small model in Docker (laptop GPU)
- [ ] k6 load-test script with a concurrency sweep
- [ ] Baseline: throughput and latency vs concurrency, one vLLM server (laptop)
- [ ] Sharing: two vLLM servers on one GPU vs one (laptop)
- [ ] Local kind cluster with Argo CD, Prometheus and Grafana
- [ ] vLLM manifests for a tainted GPU node
- [ ] Cloud GPU node joined, tainted, GPU visible to Kubernetes
- [ ] vLLM deployed to the GPU node by Argo CD
- [ ] Grafana dashboard with vLLM and GPU metrics
- [ ] Baseline and sharing experiments repeated on the cloud GPU

## Results

_None yet._
