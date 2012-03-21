(function() {

    jQuery(function($) {

        var Resource = Backbone.Model.extend({

            refresh: function(){
                var result = 1;
                this.set({value: result});
            }

        });

        window.resource = new Resource();

        resource.on('change:value', function(model, value){
            alert(value);
        });


        window.ResourceCollection = Backbone.Collection.extend({

            model: Resource

        });

    });

}).call(this);
