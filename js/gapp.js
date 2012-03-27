(function() {

    var GAPP = {};

    Resource = Backbone.Model.extend({

        url: function(){
            var id = this.get('id');
            return 'http://www.aliss.org/api/resources/' + id + '/';
        },

        parse: function(result){
            if (result.data){
                return result.data[0];
            } else {
                return result;
            }
        }

    });

    ResourceSearchCollection = Backbone.Collection.extend({

        model: Resource,
        url: 'http://www.aliss.org/api/resources/search/',

        parse: function(result) {
            return result.data[0].results;
        }

    });

    SavedSearch = Backbone.Model.extend({

    });

    SavedSearchCollection = Backbone.Collection.extend({

        model: SavedSearch

    });


    window.GAPP = {
        Resource: Resource,
        ResourceSearchCollection: ResourceSearchCollection,
        SavedSearch: SavedSearch,
        SavedSearchCollection: SavedSearchCollection
    };


}).call(this);
