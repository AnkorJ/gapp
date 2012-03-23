(function() {

    var GAPP = {};

    Resource = Backbone.Model.extend({

        url: function(){
            var id = this.get('id');
            return 'http://www.aliss.org/api/resources/' + id + '/';
        },
        parse: function(result){
            return result.data[0];
        }

    });

    ResourceCollection = Backbone.Collection.extend({

        model: Resource

    });

    SavedSearch = Backbone.Model.extend({

    });

    SavedSearchCollection = Backbone.Collection.extend({

        model: SavedSearch,

        fetch: function(){

        }

    });


    window.GAPP = {
        Resource: Resource,
        ResourceCollection: ResourceCollection,
        SavedSearch: SavedSearch,
        SavedSearchCollection: SavedSearchCollection
    };


}).call(this);
