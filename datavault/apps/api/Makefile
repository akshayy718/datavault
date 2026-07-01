# Convenience commands for the DataVault backend.
# Run these from apps/api with your virtualenv active.

.PHONY: migrate downgrade reset seed-demo run verify

migrate:          ## Apply all migrations
	alembic upgrade head

downgrade:        ## Roll back the last migration
	alembic downgrade -1

reset:            ## Drop everything and re-create from scratch
	alembic downgrade base && alembic upgrade head

seed-demo:        ## Populate demo user, workspace, dataset, and a QR share
	python -m app.seed

run:              ## Start the API locally
	uvicorn app.main:app --reload

verify:           ## Prove migrations are reversible: up -> down -> up
	alembic upgrade head && alembic downgrade base && alembic upgrade head
