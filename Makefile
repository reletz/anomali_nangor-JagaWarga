up:
	docker compose up -d --build
down:
	docker compose down
rebuild:
	docker compose up -d --build
logs:
	docker compose logs -f
