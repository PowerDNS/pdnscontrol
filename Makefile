
DESTDIR?=
CONFDIR=$(DESTDIR)/etc/powerdns

all:
	@echo "Nothing to compile. Run \"make install\" to install config files."

install:
	# install example config files
	install -d $(CONFDIR)
	install -m640 pdnsmgrd/pdnsmgrd.conf.example $(CONFDIR)/pdnsmgrd.conf
	install -m640 instance/pdnscontrol.conf.example $(CONFDIR)/pdnscontrol.conf
