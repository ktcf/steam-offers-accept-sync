class OffersWorker {
  constructor(manager, safeMode) {
    this.manager = manager;
    this.safeMode = safeMode 
    this.whitelist = [];
  };
  start() {
    const historyCut = new Date();
    const self = this;
    historyCut.setDate(historyCut.getDate() - 2); // the number is for days
    this.manager.getOffers(1, historyCut, (e, sent, received) => {
      if (e) {
        console.log(e);
        console.log('There was an error loading list of offers');
        setTimeout(() => { 
          console.log('call getoffers');
          self.start()
        }, 1000 * 60);
        return;
      } else {
        const activeOffers = this.parseOffers(received);
        console.log(`[offers] There's ${activeOffers.length} active offers`);
        self.acceptAllOffers(activeOffers);
      }
    });
  }
  acceptOneOffer(offer) {
    return new Promise(resolve => {
      if (this.safeMode === true && offer.itemsToGive.length > 0 && this.whitelist.includes(offer.partner.toString()) === false) {
        console.log('Someone\'s doing something nasty');
        offer.decline((e) => {
          return resolve(true);
        });
      } else {
        // just accept an offer by calling manager method
        let fails = 0;
        const getOfferState = () => {
          console.log(`[offers] #${offer.id}: updating state... {${fails}}`);
          this.manager.getOffer(offer.id, (e, res) => {
            if (e || res.state === 2) {
              if (++fails > 20) {
                resolve(false);
              } else {
                offer.accept((e, res) => {
                  setTimeout(() => getOfferState(), 500);
                  return;
                });
              }
            } else {
              resolve(true);
            }
          });
        };
        getOfferState();
      }
    });
  }
  async acceptAllOffers(offers) {
    let counter = offers.length;
    for (const offer of offers) {
      console.log(`[offers] #${offer.id}: accepting... {${--counter} left}`);
      await this.acceptOneOffer(offer);
    }
    console.log('[offers] There is nothing to accept');
    setTimeout(() => { this.start() }, 60000);
  }
  parseOffers(rawOffers) {
    return rawOffers.filter(offer => {
      return offer.state === 2;
    });
  }
}

module.exports.OffersWorker = OffersWorker;