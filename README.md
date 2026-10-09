# AI inference lab

A personal learning lab: serving a small LLM with vLLM on Kubernetes, deployed with Argo CD and observed with Prometheus and Grafana, with a k6 load test on a dedicated GPU node.

This is a student project for learning, not a production system. Every result below comes from a real run in this lab.

## Progress

- [ ] Docker can see the laptop GPU
- [ ] vLLM serving a small model in Docker (laptop GPU)
- [ ] k6 load-test script
- [ ] Local kind cluster with Argo CD, Prometheus and Grafana
- [ ] vLLM manifests for a tainted GPU node
- [ ] EC2 GPU node joined, tainted, GPU visible to Kubernetes
- [ ] vLLM deployed to the GPU node by Argo CD
- [ ] Grafana dashboard with vLLM metrics
- [ ] One k6 run with real numbers
