$(function(){

    var GAPP = {};

    var BaseModel = Backbone.Model.extend({

        cache: true,
        cache_time: 60,
        queryData: {},
        currentQueryData: {},

        fetch: function(options){
            options = options || (options = {});
            var data = options.data || (options.data = {});
            options.data = $.extend({}, this.queryData, data);
            this.currentQueryData = options.data;
            Backbone.Model.prototype.fetch.call(this, options);
        }

    });

    var BaseCollection = Backbone.Collection.extend({

        cache: true,
        cache_time: 60,
        queryData: {},
        currentQueryData: {},

        fetch: function(options){
            options = options || (options = {});
            var data = options.data || (options.data = {});
            options.data = $.extend({}, this.queryData, data);
            this.currentQueryData = options.data;
            Backbone.Collection.prototype.fetch.call(this, options);
        }

    });

    var Resource = BaseModel.extend({

        queryData: {
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
            'max': 10,
            'start': 0,
            'bootlocation': 10
        },

        pageNumber: 0,

        parse: function(result) {
            return result.data[0].results;
        },

        nextPage: function(){

            // If this page has less than the max per page, we are alread
            if(this.length < this.queryData.max){
                return;
            }
            var page = this.pageNumber + 1;
            this.goToPage(page);
        },

        previousPage: function(){
            var page = this.pageNumber - 1;
            if (page < 0){
                page = 0;
            }
            this.goToPage(page);
        },

        firstPage: function(){
            var page = 0;
            this.goToPage(0);
        },

        goToPage: function(pageNumber){

            this.pageNumber = pageNumber;
            var data = _.clone(this.currentQueryData);
            data.start = data.max * this.pageNumber;
            this.fetch({data:data});

        }

    });

    var SavedSearch = BaseModel.extend({

    });

    var SavedSearchCollection = BaseCollection.extend({

        model: SavedSearch,

        fetch: function(){
            this.reset([{
                query: "substance abuse",
                location: "glasgow"
            },{
                query: "substance abuse",
                location: 'aberdeen'
            },{
                query: "substance abuse"
            },{
                query: "mental health"
            },{
                query: "cafe"
            },{
                query: "multiple sclerosis"
            },{
                query: "substance abuse"
            },{
                query: "cancer"
            },{
                query: "mental health"
            },{
                query: "multiple sclerosis"
            }]);
        }

    });

    var GoogleMapView = Backbone.View.extend({

        markers: [],
        mapInitialized: false,

        initialize: function(options){
            this.results = options.results;
            this.$el.hide();
        },

        initMap: function(){
            this.map = new google.maps.Map(this.el, {
              zoom: 13,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              center: new google.maps.LatLng(55.848125, -4.437196)
            });
            this.mapInitialized = true;
        },

        addMarker: function(position, content){

            var map = this.map;

            var marker = new google.maps.Marker({
                map: this.map,
                animation: google.maps.Animation.DROP,
                position: position
            });

            this.markers.push(marker);

            var infowindow = new google.maps.InfoWindow({
                content: content
            });

            google.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map, marker);
            });

        },

        render: function(){

            if (this.results.length === 0){
                return;
            }

            if(!this.mapInitialized){
                this.$el.show();
                this.initMap();
            }

            _.each(this.markers, function(marker){
                marker.setMap(null);
            });
            this.markers = [];

            var that = this;

            var markerbounds = new google.maps.LatLngBounds();

            this.results.each(function(resource){
                _.each(resource.get('locations'), function(location){
                    var latlng = location.split(', ');
                    var glatlng = new google.maps.LatLng(latlng[0], latlng[1]);
                    markerbounds.extend(glatlng);
                    that.addMarker(glatlng, resource.title);
                });
            });

            this.map.fitBounds(markerbounds);

        }

    });

    var SearchView = Backbone.View.extend({

        tagName: "li",
        el: $("#app"),

        template: _.template($('#result-template').html() || ""),
        templateLoading: _.template($('#result-loading').html() || ""),
        templateSavedSearches: _.template($('#saved-search').html() || ""),

        events: {
            'click #search': 'search',
            'click .saved_search': 'saved_search',
            'click .next': 'nextPage',
            'click .previous': 'previousPage',
            'click .first': 'firstPage'
        },

        results: new ResourceCollection(),

        initialize: function(){

            this.results.on('reset', this.render, this);

            var savedSearches = new SavedSearchCollection();

            var tmpl = this.templateSavedSearches;
            savedSearches.on('reset', function(){
                $('#saved_searches').html(tmpl({
                    savedSearch: savedSearches.toJSON()
                }));
            });

            savedSearches.fetch();

            var map = new GoogleMapView({
                el: $('#search_map'),
                results: this.results
            });

            this.results.on('reset', map.render, map);

        },

        showLoading: function(){
            this.render(this.templateLoading);
        },

        search: function(event){
            event.preventDefault();
            this.results.fetch({data:$('#search_form').serializeHash()});
            this.showLoading();
            return false;
        },

        saved_search: function (event) {
            event.preventDefault();
            this.results.fetch({data:{
                'location': $(event.currentTarget).data('location'),
                'query': $(event.currentTarget).data('query')
            }});
            this.showLoading();
            return false;
        },

        nextPage: function(event){
            event.preventDefault();
            this.results.nextPage();
            return false;
        },

        previousPage: function(event){
            event.preventDefault();
            this.results.previousPage();
            return false;
        },

        firstPage: function(event){
            event.preventDefault();
            this.results.firstPage();
            return false;
        },

        render: function(template){

            if (!$.isFunction(template)){
                template = this.template;
            }
            var context = _.clone(this.results.currentQueryData || {});
            context.resources =  this.results.toJSON();
            context.pageNumber = this.results.pageNumber + 1;
            $('#search_results').html(template(context));
            this.delegateEvents();
            return this;
        }

    });


    window.GAPP = GAPP = {
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
