var Component = (function() {
  return Class.extend({
    wire: function(tag) {
      this.tag = tag;
      if(this.onBeforeMount) this.tag.on('before-mount', this.onBeforeMount);
      if(this.onAfterMount) this.tag.on('mount', this.onAfterMount);
      if(this.onBeforeUpdate) this.tag.on('update', this.onBeforeUpdate);
      if(this.onAfterUpdate) this.tag.on('updated', this.onAfterUpdate);
      if(this.onBeforeUnMount) this.tag.on('before-unmount', this.onBeforeUnMount);
      if(this.onAfterUnMount) this.tag.on('unmount', this.onAfterUnMount);
      this.tag.on('unmount', this.unwire);
      return this;
    },

    unwire: function() {
      if(this.onBeforeMount) this.tag.off('before-mount', this.onBeforeMount);
      if(this.onAfterMount) this.tag.off('mount', this.onAfterMount);
      if(this.onBeforeUpdate) this.tag.off('update', this.onBeforeUpdate);
      if(this.onAfterUpdate) this.tag.off('updated', this.onAfterUpdate);
      if(this.onBeforeUnMount) this.tag.off('before-unmount', this.onBeforeUnMount);
      if(this.onAfterUnMount) this.tag.off('unmount', this.onAfterUnMount);
      this.tag.off('mount', this.unwire);
      delete this.tag;
      return this;
    }
  });
})();


