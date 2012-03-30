(function() {

    var GAPP = {};

    var BaseModel = Backbone.Model.extend({

        cache: true,
        cache_time: 60,
        queryData: {},
        fetch: function(options){
            var data = options.data || (options.data = {});
            options.data = $.extend({}, this.queryData, data);
            Backbone.Model.prototype.fetch.call(this, options);
        }
    });

    var BaseCollection = Backbone.Collection.extend({

        cache: true,
        cache_time: 60,
        queryData: {},
        fetch: function(options){
            var data = options.data || (options.data = {});
            options.data = $.extend({}, this.queryData, data);
            Backbone.Collection.prototype.fetch.call(this, options);
        }
    });

    var Resource = BaseModel.extend({

        queryData: {
            'max': 30,
            'start': 0,
            'bootlocation': 10
        },

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

    var ResourceCollection = BaseCollection.extend({

        model: Resource,
        url: 'http://www.aliss.org/api/resources/search/',

        queryData: {
            'max': 30,
            'start': 0,
            'bootlocation': 10
        },

        parse: function(result) {
            return result.data[0].results;
        }

    });

    var SavedSearch = BaseModel.extend({

    });

    var SavedSearchCollection = BaseCollection.extend({

        model: SavedSearch

    });


    this.GAPP = {
        Resource: Resource,
        ResourceCollection: ResourceCollection,
        SavedSearch: SavedSearch,
        SavedSearchCollection: SavedSearchCollection
    };


}).call(this);
