all: build

build:
	rm -rf tmp
	rakep build
	rm -rf tmp

watch: build
	while inotifywait -qr templates ; do make build ; done
