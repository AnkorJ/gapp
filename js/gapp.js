$(function(){

    locache.flush();

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

    var SearchView = Backbone.View.extend({

        tagName: "li",
        el: $("#app"),

        template: _.template($('#result-template').html()),

        events: {
            'click #search': 'search',
            'click .saved_search': 'saved_search'
        },

        results: new ResourceCollection(),

        initialize: function(){

            this.results.bind('reset', this.render, this);

        },

        search: function(e){

            e.preventDefault();

            this.results.fetch({data:$('#search_form').serializeHash()});

            e.preventDefault();
            return false;
        },

        saved_search: function (e) {

            e.preventDefault();

            this.results.fetch({
                'location': $(e.currentTarget).html(),
                'query': $(e.currentTarget).html()
            });

            return false;
        },

        render: function(){

            var context = {resources: this.results.toJSON()};
            $('#search_results').html(this.template(context));

            return this;


        }

    });


    GAPP = {
        models: {
            Resource: Resource,
            SavedSearch: SavedSearch
        },
        collections: {
            SavedSearchCollection: SavedSearchCollection,
            ResourceCollection: ResourceCollection
        },
        views: {
            SearchView: SearchView
        }
    };

    var app = new SearchView();

});
