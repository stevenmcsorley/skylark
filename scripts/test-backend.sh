#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
DATABASE_URL=sqlite:///:memory: SKYLARK_TESTING=1 exec python manage.py test --noinput "$@"
