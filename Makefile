.PHONY: test lint check demo
lint:
	ruff check .

test:
	pytest

check: lint
	python -m compileall src
	pytest

demo:
	python examples/demo/build_demo.py
	wcd audit examples/demo/demo.pptx || true
	wcd render examples/demo/demo.pptx examples/demo/renders
	wcd contact-sheet examples/demo/renders examples/demo/contact-sheet.png
