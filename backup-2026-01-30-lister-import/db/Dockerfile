FROM postgres:16

# Seed and migration SQLs are executed on first container init.
COPY migrations/*.sql /docker-entrypoint-initdb.d/
COPY seed.sql /docker-entrypoint-initdb.d/
