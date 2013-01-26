all: build

build:
	rm -rf tmp
	/var/lib/gems/1.9.1/bin/rakep build
	rm -rf tmp

watch: build
	while inotifywait -qr templates ; do make build ; done
