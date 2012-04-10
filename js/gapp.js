/*jshint asi:true */

$(function(){

    "use strict";

    var GAPP = {}

    var BaseModel = Backbone.Model.extend({

        cache: true,
        cache_time: 600,
        queryData: {},
        currentQueryData: {},

        fetch: function(options){
            options = options || (options = {})
            var data = options.data || (options.data = {})
            options.data = $.extend({}, this.queryData, data)
            this.currentQueryData = options.data
            Backbone.Model.prototype.fetch.call(this, options)
        }

    })

    var BaseCollection = Backbone.Collection.extend({

        cache: true,
        cache_time: 600,
        queryData: {},
        currentQueryData: {},

        fetch: function(options){
            options = options || (options = {})
            var data = options.data || (options.data = {})
            options.data = $.extend({}, this.queryData, data)
            this.currentQueryData = options.data
            Backbone.Collection.prototype.fetch.call(this, options)
        }

    })

    var Resource = BaseModel.extend({

        queryData: {
        },

        url: function(){
            var id = this.get('id')
            return 'http://www.aliss.org/api/resources/' + id + '/'
        },

        parse: function(result){
            if (result.data){
                return result.data[0]
            } else {
                return result
            }
        }

    })

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
            return result.data[0].results
        },

        fetch: function(options){

            var data = options.data;

            if (data && (data.query !== this.queryData.query || data.location !== this.queryData.location)){
                this.pageNumber = 0
            }

            return BaseCollection.prototype.fetch.call(this, options);

        },

        nextPage: function(){

            // If this page has less than the max per page, we are alread
            if(this.length < this.queryData.max){
                return
            }
            var page = this.pageNumber + 1
            this.goToPage(page)
        },

        previousPage: function(){
            var page = this.pageNumber - 1
            if (page < 0){
                page = 0
            }
            this.goToPage(page)
        },

        firstPage: function(){
            var page = 0
            this.goToPage(0)
        },

        goToPage: function(pageNumber){

            this.pageNumber = pageNumber
            var data = _.clone(this.currentQueryData)
            data.start = data.max * this.pageNumber
            this.fetch({data:data})

        }

    })

    var SavedSearch = BaseModel.extend({

    })

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
            }])
        }

    })

    var GoogleMapView = Backbone.View.extend({

        markers: [],
        mapInitialized: false,

        initialize: function(options){
            this.results = options.results
            this.$el.hide()
        },

        initMap: function(){
            this.map = new google.maps.Map(this.el, {
              zoom: 13,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              center: new google.maps.LatLng(55.848125, -4.437196)
            })
            this.mapInitialized = true
        },

        addMarker: function(position, content){

            var map = this.map

            var marker = new google.maps.Marker({
                map: this.map,
                animation: google.maps.Animation.DROP,
                position: position
            })

            this.markers.push(marker)

            var infowindow = new google.maps.InfoWindow({
                content: content
            })

            google.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map, marker)
            })

        },

        render: function(){

            if (this.results.length === 0){
                return
            }

            if(!this.mapInitialized){
                this.$el.show()
                this.initMap()
            }

            _.each(this.markers, function(marker){
                marker.setMap(null)
            })
            this.markers = []

            var that = this

            var markerbounds = new google.maps.LatLngBounds()

            this.results.each(function(resource){
                _.each(resource.get('locations'), function(location){
                    var latlng = location.split(', ')
                    var glatlng = new google.maps.LatLng(latlng[0], latlng[1])
                    markerbounds.extend(glatlng)
                    that.addMarker(glatlng, resource.title)
                })
            })

            this.map.fitBounds(markerbounds)

        }

    })

    // Create a global instance of the map - we only really ever want there
    // to be one.
    var google_map = new GoogleMapView({
        el: $('#search_map'),
        results: this.results
    })


    $('#resourceView').hide()

    var ResourceView = Backbone.View.extend({

        el: $("#resourceView"),

        template: _.template($('#resource-template').html() || ""),

        events: {
            'click .back': 'back'
        },

        results: new ResourceCollection(),

        initialize: function(){
        },

        showResource: function(resource){
            this.$el.html(this.template(resource.toJSON()));
            this.show();
        },

        back: function(){

        },

        show: function(){
            $('#search_results').hide();
            this.$el.show();
        }

    })

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
            'click .first': 'firstPage',
            'click .detail': 'showResource'
        },

        results: new ResourceCollection(),

        initialize: function(){


            var savedSearches = new SavedSearchCollection()

            var tmpl = this.templateSavedSearches
            savedSearches.on('reset', function(){
                $('#saved_searches').html(tmpl({
                    savedSearch: savedSearches.toJSON()
                }))
            })

            savedSearches.fetch()

            this.map = google_map
            this.map.results = this.results

            this.results.on('reset', this.map.render, this.map)
            this.results.on('reset', this.render, this)

            this.resourceView = new ResourceView()

        },

        showLoading: function(){
            this.render(this.templateLoading)
        },

        search: function(event){
            event.preventDefault()
            this.showLoading()
            this.results.fetch({data:$('#search_form').serializeHash()})
            return false
        },

        saved_search: function (event) {
            event.preventDefault()
            var location = $(event.currentTarget).data('location')
            var query = $(event.currentTarget).data('query')

            $('#id_location').val(location)
            $('#id_query').val(query)
            this.showLoading()
            this.results.fetch({data:{
                location: location,
                query: query
            }})
            return false
        },

        nextPage: function(event){
            event.preventDefault()
            this.results.nextPage()
            return false
        },

        previousPage: function(event){
            event.preventDefault()
            this.results.previousPage()
            return false
        },

        firstPage: function(event){
            event.preventDefault()
            this.results.firstPage()
            return false
        },

        showResource: function(event){
            event.preventDefault()
            var id = $(event.currentTarget).data('id')
            var resource = this.results.get(id)
            this.resourceView.showResource(resource)
            return false
        },

        render: function(template){

            if (!$.isFunction(template)){
                template = this.template
            }
            var context = _.clone(this.results.currentQueryData || {})
            context.resources =  this.results.toJSON()
            context.pageNumber = this.results.pageNumber + 1
            $('#search_results').html(template(context))

            this.delegateEvents()
            return this
        }

    })



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
    }

    var app = new SearchView()

})
