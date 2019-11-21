<!DOCTYPE html>
<html>
  <head>
    <title>Search {{searchType}}</title>
    <link rel="stylesheet" href="/css/style.css">
  </head>
  <body>

    <div class="page">
    {{#isType}}
    <h1  class="tst-sensor-types-search-page">Search {{searchType}}</h1>
    {{/isType}}

    {{^isType}}
    <h1 class="tst-sensors-search-page">Search {{searchType}}</h1>
    {{/isType}}

    <div class="error">
      {{#wsError}}
        <strong>{{wsError}}</strong>
      {{/wsError}}
    </div>
       
    <form method="GET">

      {{#widgets}}
        {{>widget}}
      {{/widgets}}

      <label>&nbsp;</label><input type="submit" value="search">
    </form>
    </div>
    {{>results}}
    {{>footer}}
  </body>
</html>