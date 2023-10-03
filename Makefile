install:
	pip install --upgrade pip &&\
		pip install -r requirements.txt

test:
	python -m pytest -vv test_generator.py

format:
	black *.py

lint:
	pylint --disable=R,C generator.py

all: install lint test