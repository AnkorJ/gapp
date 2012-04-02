(function() {

    var GAPP = {};

    var BaseModel = Backbone.Model.extend({

        cache: true,
        cache_time: 60,
        queryData: {},
        fetch: function(options){
            options = options || (options = {});
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
            options = options || (options = {});
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

    var ResourceSearchView = Backbone.View.extend({

        tagName: "li",
        el: $("#app"),

        resultsTemplate: _.template([
            '<div class="result">',
              '<h4><%= title %></h4>',
            '</div>'
        ].join(" ")),

        events: {
            'click #search': 'search'
        },

        initialize: function(){
        },

        search: function(e){
            alert(e);
        },

        render: function(){
            alert(1);
        }

    });

    this.GAPP = {
        'models': {
            Resource: Resource,
            SavedSearch: SavedSearch
        },
        'collections': {
            SavedSearchCollection: SavedSearchCollection,
            ResourceCollection: ResourceCollection
        },
        'resources': new ResourceCollection(),
        'searches': new SavedSearchCollection()
    };

    var App = new ResourceSearchView();


}).call(this);
