OPENAPI?=docs/openapi.yaml

.PHONY: openapi-validate
openapi-validate:
	@echo "Validating $(OPENAPI) with openapi-spec-validator..."
	@python -m pip install --quiet openapi-spec-validator PyYAML >/dev/null 2>&1 || true
	@python -c 'import sys, yaml; from openapi_spec_validator import validate_spec; validate_spec(yaml.safe_load(open(sys.argv[1]))); print("OK:", sys.argv[1], "is a valid OpenAPI 3 spec")' "$(OPENAPI)"

.PHONY: openapi-validate-docker
openapi-validate-docker:
	@docker run --rm -v "$$(pwd)":/work -w /work redocly/openapi-cli:latest lint $(OPENAPI)

.PHONY: test-backend
test-backend:
	@scripts/test-backend.sh
