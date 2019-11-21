<!DOCTYPE html>
<html>
  <head>
    <title>Create / Update {{searchType}}</title>
    <link rel="stylesheet" href="/css/style.css">
  </head>
  <body>
    <div class="page">
    {{#isType}}
    <h1  class="tst-sensor-types-search-page">Create / Update {{searchType}}</h1>
    {{/isType}}

    {{^isType}}
    <h1 class="tst-sensors-search-page">Create / Update {{searchType}}</h1>
    {{/isType}}

    <div class="error">
      {{#wsError}}
        <strong>{{wsError}}</strong>
      {{/wsError}}
    </div>
       
    <form method="POST">

      {{#widgets}}
        {{>widget}}
      {{/widgets}}

      <label>&nbsp;</label><input type="submit" value="add">
    </form>
    </div>
    {{>footer}}
  </body>
</html>