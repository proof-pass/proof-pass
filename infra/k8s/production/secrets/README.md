## Generate sealed secrets

```bash
kubectl create secret generic backend -n app --dry-run=client --from-env-file=backend.secret.env -o json | kubeseal --controller-namespace=sealed-secrets -o yaml > backend.yaml

kubectl create secret generic issuer -n app --dry-run=client --from-env-file=issuer.secret.env -o json | kubeseal --controller-namespace=sealed-secrets -o yaml > issuer.yaml

kubectl create secret generic postgres -n app --dry-run=client --from-env-file=postgres.secret.env -o json | kubeseal --controller-namespace=sealed-secrets -o yaml > postgres.yaml
```
