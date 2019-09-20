function selectListsWithLengthMultiple(lists, multiple=2) {
  return lists.filter(a => a.length % multiple === 0);
}

/*referenced MDN*/
function reverse(text) {
  return text.split('').reverse().join('');
}

/*referenced MDN for /\W+/g part*/
function isPalindrome(text) {
  return text.toLowerCase().replace(/\W+/g,'') === text.toLowerCase().replace(/\W+/g,'').split('').reverse().join('');
}

function minLenArg(...objs) {
  return objs.sort((a,b) => (a.length - b.length))[0];
}

function formatInt(int, {base=10, n=3, sep=','} =
                   {base: 10, n:3, sep: ','}) {
  return int.toString(base).split('').reverse().flatMap((a,i,arr) => (((i+1)%n === 0) && (i !== arr.length-1) && (i!==0)) ? [arr[i], sep]: arr[i]).reverse().join('');
}


function isEvenParity(int) {
  return (int.toString(2).split('').filter(a => a === 1).length % 2) === 0;
}

/*referenced stackoverflow for the (a,b)=>(a+b),0 part of reduce function*/
function bitIndexesToInt(indexes) {
  return indexes.map(a => Math.pow(2 , a)).reduce((a,b) => (a+b) , 0);
}

function intToBitIndexes(int) {
  return int.toString(2).split('').reverse().map((a, i) => a==='1' ? i : 'x').filter(e => e!= 'x');
}

function multiIndex(obj , indexes) {
  return indexes.split('.').reduce((acc, i) =>  i ? acc[i] : acc , obj);
}

/*referenced stackoverflow*/
function zip(list1 , list2) {
  return list1.map((e, i) => [e,list2[i]]);
}

function multiZip(...lists) {
  return lists[0].map((e , i) => lists.map((list) => list[i]));
}

function multiZipAny(...lists) {
  return lists.sort((a,b) => (a.length - b.length))[0].map((e , i) => lists.map((list) => list[i]));
}


/*answers to the other questions are on paper*/
