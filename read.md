# D&D Master Screen
This is a simple app to help dungeon Masters and other people with the same problems display a map for their players. It's a t a prototype stage, but the gist is, you can open a secondary tab in your browser to get a player-declined version of a map display, with fog of war, pawns to move along and, for the time being, that's all.

## Define your settings

You can define some simple base options to get things and values inside the app. Simply edit the **settings.json** file:
```json
{
  "cellSize":20,
  "pawns":[//a list of available pawns to create and manage. Property kind is of little consequence at this time
    {"kind":"orc","image":"orc.png"}
  ],
  "maps":[//a list of maps, the file name is enough at this time
    {"filename":"dungeon.png"}
  ]
}
```
In detail:
- cellSize: defines the value in pixel for cell sizec. At this time is used to render fitting pawns
- pawns: an array of objects with kind* and *image* properties. Image should correspond to a filename inside the **assets** folder
- maps: an array of object with the single *filename* property, which should correspond to the map's file name

## Manage your assets
At this time, alla ssets (images) go into the **assets** folder, and they must correspond to names in the settings file.

## Saving game
At this time, the app saves automatically each time you do something of note (create or move a pawn, create a hole in the fog of war). Saves are put in localStorage as a parsable json string, for easy readability and on-the-fly editing.

The key corresponds to the map's filename, thus **starting a new game on a map will kill an existing saved game on the same map**. It's a silly logic but it's in for the time being so, as they say, ***YOU'VE BEEN WARNED***. Create copies with a different name to run circles around the problem at this time.