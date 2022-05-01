
# FOR PUZZLE

- [x] make a compile button
- [x] do basic bounding-box filtering for a single piece
- [x] do all pieces, and explode them out from the center
- [x] allow you to manually adjust the pieces, in world-space

CUTTING LASER

- 20%, 200mm/s and 10mm/s

0.2 shrink seems ok
we might want to make the pieces larger? hmmm

but the roads need to be much darker



Ok thinking about how to bake these pieces.
Clip will be mega non-performant, not to mention meerk40t doesn't support it.
So I think I'll use skia to clip everything.
Which does mean that I'll be using a separate render method that reimplements
everything, which is something of a pain.
unless .. I .. make a 'svg to skia' thing?
that's kindof interesting actually.
oh ugh but then I'd have to parse transforms? yeah not into it.

And I could join things by color

# Editor

- [x] make a show/hide details button to improve perf
- [x] actually figure out the transform so my name offsets are in the right coordinate system
- [x] handle 'selection' of a label, so I can do rotation & scaling
- [-] have a 'show/hide hidden labels' in case I hid something by accident
- [x] clip to the city



- [ ] I think I might want to make a separate program that is "rearrange your svgs for printing"?
  - it would read in an SVG, and like, just allow you to move toplevel 'g's around?
    and rotate them probably.
    could be quite simple.
    OH but it would know how to export multiple files, for multiple cuttings if there's too much
    for your laser bed.

- need to do all the clippings, and then toss them on a canvas so you can arrange them into cuts
- figure out the right kerf for that thanks
- allow names to be rotated, and shrunk.
    - also split into two lines

- [x] hmm I don't know if I actually want residential streets 🤔


Want a BOX
- do the channels on 3 sides, with a cover that slides in
- the back channel should be a little tighter, so you get a snug fit!


Ok but I really should have my preprocessor do a "polygon inside test" and remove
all roads and such that are outside of the city.


ooh what if I had the skeleton of the outside thing, with some interesting
informative text about st louis history or something?









Ok nice, we're looking pretty good.
I've got something that I could laser on my machine,
although it would take an hour and a half

I want to do some tests


OK Laser settings:
- 15% @ 200mm/s, and 
    trunk: '#111',
    motorway: '#333',
    primary: '#555',
    secondary: '#666',
    tertiary: '#777',
    residential: '#888',

    others: '#888',
	ended up being rather too faint.
- 20% @ 200mm/s, and all black
	much better! Although I think the text might be better at the lighter (15%)?
	So once meerk40t can do clips, that would be nice.
	Although the small text is less readable at 15%.


I'll want to bring ... some example wood? to the laser? idk.





- [x] ok, but so let's only have one, and have it near the midpoints.
- [x] I need to filter out shortish roads too (just made it so I can hide things manually)




Ok, so to get this in good shape:
- put the labels in good places! making UI to move & remove them manually.
- come up with a better outline? idk.






places - names of neighborhoods!
roads  - primary is good
natural - parks!

Ok, so my basic idea is:
load up the roads ...

ok, and let's use pathkit to union all the roads together.
also, I need to turn fonts into paths.

ok, adding the text, and then making a thing around it.

BBBike extract, thank you! https://extract.bbbike.org/extract.html
make it easy to grab out a chunk of the world
