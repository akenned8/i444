<h2>Results Summary</h2>

<table class="summary">
    <thead>
      {{#isType}}
  	   <tr>
          <th>Manufacturer</th>
          <th>Sensor Type ID</th>
          <th>Model Number</th>
          <th>Measure</th>
          <th colspan="2">Limits</th>
  	   </tr>
       <tr>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th>Min</th>
          <th>Max</th>
       </tr>
       {{/isType}}

       {{^isType}}
       <tr>
          <th>Sensor ID</th>
          <th>Model</th>
          <th>Period</th>
          <th colspan="2">Expected Range</th>
       </tr>
       <tr>
          <th></th>
          <th></th>
          <th></th>
          <th>Min</th>
          <th>Max</th>
       </tr>
       {{/isType}}

  	   
     </thead>
     <tbody>
      {{#search.data}}
       <tr>
        {{#isType}}
         <td>{{manufacturer}}</td>
         <td>{{id}}</td>
         <td>{{modelNumber}}</td>
         <td>{{quantity}}</td>
         <td>{{limits.min}}</td>
         <td>{{limits.max}}</td>
         {{/isType}}

         {{^isType}}
         <td>{{id}}</td>
         <td>{{model}}</td>
         <td>{{period}}</td>
         <td>{{expected.min}}</td>
         <td>{{expected.max}}</td>
         {{/isType}}
       </tr>
      {{/search.data}}
     </tbody>
</table>
<div class="scroll">
  {{#search.prev}}
  <a class="tst-prev" href="{{search.prevQuery}}" rel="prev">&lt;&lt;</a>
  {{/search.prev}}

  {{#search.next}}
  <a class="tst-next" href="{{search.nextQuery}}" rel="next">&gt;&gt;</a>
  {{/search.next}}
</div>