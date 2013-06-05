Fishtank.js (XDft)
=========

Fishtank is a quick and dirty data management tool for storing and fetching data on the client side.
 
Version
-
1.1.0

Author
-
Geoff Daigle
@dailydaigle

Overview
-----------

Fishtank has a number of great methods to help you deal with all of your javascript objects:

* .find() - Use selectors similar to dom queries to traverse through objects and retrieve data
* .where() - Filter your searches by using all kinds of property comparisons
* .update() - Safely change data in storage without having to touch the objects yourself
* .insert() - Add new properties or overwrite ones already in place
* .append() / .prepend() - If your object is an array, you can quickly add values using these
* .remove() - Delete an object property or array index
* .get() / .getRow() / .first() - return the data so it can be used in your application
* .use() - Set query strings that are applied every time you search for data
* .pointer() - Return the storage pointer so other apps can manipulate the data on their own

Requirements
--------------
Fishtank does not require any external libraries to work! 
Simply include the code in your html &lt;head&gt; element.

Examples
---------
Let's use this test data below to run through some examples:

```js
var test_data = {
	animals: [
		{ species: 'dog', isImaginary: false },
		{ species: 'cat', isImaginary: false },
		{ species: 'spider', isImaginary: false },
		{ species: 'octopus', isImaginary: false },
		{ species: 'dragon', isImaginary: true },
		{ species: 'elephant', isImaginary: false },
		{ species: 'monkey', isImaginary: false },
		{ species: 'dolphin', isImaginary: false },
		{ species: 'unicorn', isImaginary: true }
	],
	cars: {
		volvo: {
			isForeign: true,
			founded: '1915',
			country: 'Sweden'
		},
		ford: {
			isForeign: false,
			founded: '1903',
			country: 'United States'
		},
		audi: {
			isForeign: true,
			founded: '1909',
			country: 'Germany'
		}
	}
};
```
First, we need to store the data in the fishtank storage object:

```js
XDft.insert( test_data );

// Alternatively, we could use:
// XDft.insert( 'PROP_NAME' test_data );
// to assign test_data to a property called PROP_NAME, 
// but we don't really need to for the below examples
```

Let's say I want to get the data of certain cars and assign the result to a variable. Here's how it's done:

```js
var myVolvo = XDft('cars.volvo').get(),
    // you can also use .find()
    myFord = XDft('cars').find('ford').get();
    
    console.log(myVolvo);
    //{
    //	isForeign: true,
	//	founded: '1915',
	//	country: 'Sweden'
	//}
    
    // ( Same structure for "myFord" )
```
Select array elements with .eq()

```js
var myDragon = XDft('animals.eq(4)').get();

    console.log(myDragon);
    //{
    //  species: 'dragon',
	//	isImaginary: true
	//}
```
For bigger sets of data that share matching attributes or fit into a comparison result set, use .where()

```js
    // two strings (equal)
   var resultSet_animals = XDft('animals').where('isImaginary', true).get();
   console.log( resultSet_animals.length ); // 2
   
   // an object (equal AND equal)
   var resultSet_animals2 = XDft('animals').where({isImaginary: true, species: 'dolphin'}).get();
   console.log( resultSet_animals2.length ); // 0
   
   // one string (any comparison that is allowed) [ >=, <=, >, <, !=, = ]
   var resultSet_cars = XDft('cars').where('founded > 1905').get();
   console.log( resultSet_cars.length ); // 2
```
If you want to separate your data into "databases", you can call .use() to "focus" on one at a time

```js
var volvo_country = XDft('cars.volvo.country').get();
console.log(volvo_country); // Sweden

XDft.use('cars'); // imply that we are always searching within "cars"

volvo_country = XDft('volvo.country').get();
console.log(volvo_country); // Sweden
```
Update your data using .update()

```js
var volvo_country = XDft('cars.volvo').update({country: 'VolvoLand'}).find('country').get();
console.log(volvo_country); // VolvoLand

// you can also update a whole result set
XDft('animals').where('isImaginary', true).update('isImaginary', false); // set every one to False
var resultSet_animals = XDft('animals').where('isImaginary', true).get();
console.log( resultSet_animals.length ); // 0
```

Coming soon
--
- [ ] XDft.extend() for adding plugins
- [ ] Documentation on remove(), getRow(), first(), and append()/prepend()

Notes
---
There is a small bug in remove() where it doesnt clear out "undefined" values when removing from an array. I am working on this.

License
-

MIT

