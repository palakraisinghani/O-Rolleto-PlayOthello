// Everything Orolleto can say, grouped by situation. Add lines freely: the dealer (dealer.ts) picks
// from a pool at random and avoids repeating what he said recently, so bigger pools = more variety.
//
// Voice: kind, welcoming, enthusiastic and supportive. Against the computer he is the opponent
// across the table, so he speaks in the first person ("I'll play here"); in two-player games and on
// the menus he is the host.

export const POOLS = {
  // ------------------------------------------------------------------ pages
  home: [
    "Welcome, friend! I'm Orolleto. So glad you stopped by!",
    'Come on in, the table is warm and the discs are shiny!',
    'Ah, a friendly face! Shall we play a game?',
    'Welcome to the card room! I saved you the best seat.',
    'Hello again! I was hoping you would drop in.',
    'Pull up a chair. Every game here is a good one!',
    'Wonderful to see you! Ready for a lovely match?',
    "The felt is fresh and the lights are bright. Let's play!",
    'Hi there! Win or lose, it is a pleasure to see you.',
    'Step right up! Othello is better with company.',
    'Welcome! I promise to play fair and cheer you on.',
    'Good to have you here! Shall I deal you in?',
    'Look who is here! Today feels like a lucky day.',
    'Make yourself at home. The first game is on me!',
    'Hello, hello! Pick a game and let us have some fun.',
    'Ah, wonderful, a player after my own heart!',
    'The best part of my day is when a friend sits down to play.',
    'Come, come! Plenty of room at the table, and plenty of fun to share.'
  ],
  setupComputer: [
    'Excellent choice! Pick a level that feels fun. There is no wrong answer.',
    'Easy is relaxed, Master is spicy. I am happy to play either!',
    'Not sure which level? Start gently, we can always turn it up.',
    'Black moves first, if you fancy it. White lets you see my opening!',
    'I will play my very best at your level. Promise!',
    'Ooh, a match against me? I am delighted!',
    'Pick your side and your level, and I will set up the table.',
    'Take your time, I am in no hurry. I love this part.',
    'Feeling brave? Master is a real challenge, and I would love to see you try.',
    'Every great player started on Easy. No shame at all!',
    'Choose Random if you like surprises. I do!',
    'Whatever you pick, I am going to enjoy this game with you.',
    'I have been looking forward to a game all day. Let us get started!',
    'There is no pressure here, only fun. Choose what feels right!'
  ],
  setupTwo: [
    'Two players? How lovely! I will keep an eye on the table.',
    'Bring a friend, bring a rival. Either way, it is a party!',
    'Type your names and I will announce you properly!',
    'Friendly games are the best games. Have fun, you two!',
    'I will be your host. May the best discs win!',
    'Great to see friends at the table. Names, please!',
    'I will referee, and I promise not to take sides.',
    'Two seats, one board. A perfect setup!',
    'Shake hands first, then place your discs. That is the tradition!',
    'A match between friends? My favourite kind.',
    'I will keep score and cheer for both of you!'
  ],
  setupBuddy: [
    'Buddy is a clever friend: always one step ahead of you, never too far.',
    'Play Buddy and it learns how you play, then keeps the game just challenging enough.',
    'The more you play, the better Buddy knows you. Lovely!',
    'Buddy never plays too hard. It stays a small step above you.',
    'A friendly rival who grows as you grow. I like that!'
  ],
  progress: [
    'Look at that curve! Every game teaches us something.',
    'Your level is a trail, and you are walking it nicely.',
    'Progress is a lovely thing to watch. Keep going!',
    'A few games more, and Buddy will know you like an old friend.',
    'Slow and steady climbs the highest. Well done!'
  ],
  settings: [
    'Make the room just right for you. It is your table!',
    'Want the little rings that show where you can play? A lovely helping hand.',
    'Prefer it quiet and still? Switch the animations off, I will not mind.',
    'Tweak whatever you like. I will be right here!',
    'Your favourite difficulty, your favourite colour. Set once, play happily.',
    'Comfort first! A relaxed player is a great player.',
    'Oh, settings! The secret behind every good game night.',
    'I do love the lights, but you are the boss of this room.',
    'Take your time here. I will keep your seat warm.',
    'Anything to make the game nicer for you!'
  ],
  help: [
    'Othello is simple to learn and wonderful to master. You have got this!',
    'Remember: trap my discs between two of yours and they flip to your colour.',
    'Corners are special, nobody can flip them. Treasure them!',
    'If you have no move you pass. No worries, it happens to everyone.',
    'Most discs at the end wins. Simple and beautiful, isn’t it?',
    'Ask me for a tip any time during a game. I love to help!',
    'Do not worry about mistakes. Every one of them is a lesson.',
    'Read it slowly, then let us play. I will go easy at the start!',
    'Edges can be tricky, corners are lovely, and patience wins games.',
    'Questions? Just play a round. The best way to learn is by doing!',
    'Take your time with the rules. I am not going anywhere!'
  ],

  // ------------------------------------------------------------------ starting a game
  startComputer: [
    "Here we go! Good luck, my friend. I'll do my best, and so will you!",
    "Let's have a wonderful game. May the best player enjoy it most!",
    'I am so excited to play you! Your move whenever you are ready.',
    "The discs are on the felt and the lights are on. Let's go!",
    'Take your time. I love watching you think.',
    'Ready when you are! I promise to play fair and have fun.',
    'A fresh board is full of possibilities. Show me something good!',
    'Deep breath, friend. This is going to be fun!',
    'I have been looking forward to this. Go ahead, place your first disc!',
    "Let's make this a game to remember!",
    'Good luck! And if you want a tip, just ask.',
    'Thank you for sitting down with me. Let us have a great game!',
    'Oh, I love the first move of a new game. Over to you!'
  ],
  startComputerFirst: [
    'I will open this one, and then it is all yours!',
    'Let me start us off. I cannot wait to see how you answer!',
    'I will play first this time. Your turn comes right up!',
    'Here goes my opening. Get ready, friend!',
    'Allow me to open. Then the stage is yours!'
  ],
  startTwo: [
    'Players, take your seats! Let the game begin!',
    'Good luck to you both! May the best player win, and may both have fun.',
    'I will be right here watching. Make it a good one!',
    'A friendly match begins! Black moves first.',
    'Discs ready, lights on. Enjoy, you two!',
    'Here we go! I love a match between friends.'
  ],

  // ------------------------------------------------------------------ during a game: the computer's turn
  thinking: [
    'Hmm, let me think about that…',
    'Ooh, that is an interesting move. Give me a moment…',
    'Let me study the board…',
    'Nicely played! Now what shall I do…',
    'One second, friend. I am counting discs…',
    'Tough one! Let me see…',
    'I like where this is going. Thinking…',
    'Mmm, so many options…',
    'You have given me something to chew on!',
    'Let me find a good reply…',
    'Patience, patience. I am nearly there…',
    'That is clever. Let me think…',
    'Aha, I think I see something. Hold on…',
    'Good move! I need a moment.',
    'Checking corners, checking edges…',
    'Let me make this one count…',
    'Concentrating hard here!',
    'This is why I love this game…',
    'Almost there, friend!',
    'Oh, you are keeping me on my toes!'
  ],
  computerPlain: [
    'There! Your turn, friend.',
    'I will play here. What do you think?',
    'Over to you. I am excited to see your move!',
    'That was fun! Your move.',
    'Placed it! Take your time.',
    'Let us see how you answer that. No pressure!',
    'Your turn! I have a feeling you will find something clever.',
    'Done! The board is all yours.',
    'Hope you like that one!',
    'A quiet little move. Your turn!',
    'Phew, that was a tough decision.',
    'Whenever you are ready, friend!',
    'I tried something. Let us see if it works!',
    'Your move. The table is full of possibilities.',
    'And now, the spotlight is yours!',
    'There we go. What a lovely game this is.',
    'I am having a great time. Are you?',
    'That is my move. Show me what you have got!',
    'Your turn. I am rooting for a good one!',
    'Careful and thoughtful, that is the way. Your go!',
    'The board is getting interesting, isn’t it?',
    'Go on, surprise me!',
    'Take a moment. It is a good position to think about.',
    'Placed! Now, how will you reply?',
    'Fun, fun, fun! Your turn.'
  ],
  computerCorner: [
    'I grabbed a corner! Lucky me, but you are still doing wonderfully.',
    'Corner! I could not resist. Your move, friend.',
    'Ooh, a corner for me. The game is far from over!',
    'I will gladly take that corner, and you can take the next one!',
    'A corner! They are so precious. I hope you do not mind!',
    'That corner felt good, but you are playing beautifully.',
    'Sorry, friend, I had to! Corners are irresistible.',
    'Corner mine. Now let us see your comeback!',
    'A cheeky corner. You are making this such a fun game!',
    'Got the corner! Now it is anybody\'s game again.'
  ],
  computerBig: [
    'Whoosh! That flipped a lot, but the game is still wide open.',
    'Look at all those discs turning! Your move, friend.',
    'Big flip! Do not worry, they are easy to win back.',
    'That was a big one! But you can answer it.',
    'Flip, flip, flip! Lovely. Over to you.',
    'A big swing! Now let us see your reply.',
    'Such a satisfying flip. Your turn!',
    'Whoa, plenty of discs changed hands! Exciting!'
  ],

  // ------------------------------------------------------------------ during a game: your move
  humanPlain: [
    'Lovely move!',
    'Ooh, I like that!',
    'Nice thinking, friend!',
    'That is a good one. I need to be careful now!',
    'Well played!',
    'You are making this really fun.',
    'Smart! I like how you think.',
    'Beautiful placement.',
    'Good choice! I am impressed.',
    'You are getting the hang of this, and then some!',
    'That was a clever idea.',
    'Great move! You keep me on my toes.',
    'Tidy and sensible. Nicely done!',
    'You have a good feel for this game.',
    'Ooh, I did not see that coming!',
    'Brilliant! Let me think about how to answer.',
    'That is the spirit!',
    'Excellent! You are really enjoying this, aren’t you?',
    'Steady and sure. I like it.',
    'You play so thoughtfully.',
    'That one made me smile.',
    'Keep it up, you are doing wonderfully!',
    'Great instincts!',
    'Superb! This is such a good game.',
    'I love how you set that up.',
    'Oh, that is neat.',
    'You have got style, friend!'
  ],
  humanCorner: [
    'A corner! Fantastic play!',
    'Wow, you took a corner. That is expert stuff!',
    'Brilliant! Corners are the jewels of the board.',
    'Yes! Great corner, you earned it.',
    'That corner is going to serve you well. Bravo!',
    'Oh, well spotted! What a wonderful corner.',
    'You found the corner! I am so impressed.',
    'Beautiful! That corner can never be flipped.',
    'Hurrah for the corner! You are a natural.',
    'Nicely done. A corner is worth its weight in gold.',
    'That is the move of a real player. Bravo!',
    'A corner! I am cheering for you!'
  ],
  humanBig: [
    'Wow, what a flip! Splendid!',
    'That is a lot of discs! You are on fire!',
    'Magnificent! The whole board shifted.',
    'Look at that swing! Fantastic!',
    'Whoa, big move! I love it.',
    'Superb flip, friend! I felt the ground move.',
    'That was spectacular!',
    'Such a satisfying move. Bravo!',
    'Impressive! You made that look easy.',
    'A sweeping move! Wonderful!'
  ],

  // ------------------------------------------------------------------ the shape of the game
  opening: [
    'The opening is such a fun part. Anything can happen!',
    'Early days yet, and lots of game ahead!',
    'I love the first few moves. The board is full of promise.',
    'A nice, steady start, friend!',
    'The pattern is just beginning to form.',
    'Plenty of room to be creative!'
  ],
  middle: [
    'We are in the thick of it now, and I am loving this!',
    'The middle game is where the magic happens.',
    'So many ideas on the board!',
    'It is getting exciting, isn’t it?',
    'Every move matters now, and you are doing great.',
    'What a rich position!'
  ],
  ending: [
    'Almost there! Every disc counts now.',
    'The finish line is in sight. Enjoy it!',
    'Just a few squares left. What a game!',
    'Home stretch, friend. You are doing wonderfully!',
    'Careful counting from here on. Exciting!',
    'Last few moves. Let us make them good ones!'
  ],
  youLead: [
    'You are pulling ahead. Wonderful play!',
    'Look at you go! You are in front.',
    'You have got the lead. Keep that lovely momentum!',
    'Impressive! I will have to work to catch up.',
    'You are ahead, and you deserve it.',
    'The numbers are on your side. Nicely done!'
  ],
  iLead: [
    'I am a little ahead, but this game can turn in a heartbeat. Keep going!',
    'Do not worry about the numbers. Othello is all about the final moves.',
    'I have a few more discs, but you are playing so well!',
    'Plenty of time to turn it around. I believe in you!',
    'The lead means little until the end. You have got this!',
    'Chin up, friend. The best moves are still to come!'
  ],
  close: [
    'What a close game! I love it.',
    'Neck and neck! Delightful.',
    'We are evenly matched. Such good fun!',
    'Nobody is ahead! This is exciting.',
    'It is a real contest now, friend.',
    'Perfectly balanced. I am smiling!'
  ],

  // ------------------------------------------------------------------ events
  passHuman: [
    'No move for you this time. Do not worry, I will play again!',
    'A pass! It happens to everyone, friend. I will go ahead.',
    'No legal move? That is just the way the discs fall. My turn again!',
    'Passing is part of the game. No harm done!',
    'I will take another turn, but you will be back soon!',
    'That is okay! On we go.'
  ],
  passComputer: [
    'Oh! I have no move, so it is your turn again. Lucky you!',
    'I must pass. Go right ahead, friend!',
    'No move for me. Take another turn, you have earned it!',
    'I am stuck! Enjoy a double turn.',
    'A pass for me. Make it count, friend!',
    'Nothing for me to play. You are up again!'
  ],
  hint: [
    'Of course, happy to help! Look for the glowing square.',
    'A tip, coming right up! I would try that one.',
    'Good idea to ask. Here is my favourite.',
    'I love helping. Try the highlighted square!',
    'There you go, friend. No shame in asking!',
    'Asking for help is a smart player\'s move!',
    'Here is something nice to consider.',
    'My pleasure! The glowing square is worth a look.'
  ],
  undo: [
    'Of course, take it back! We all deserve a second thought.',
    'No problem at all. Rewind we go!',
    'Undo away! I am in no rush.',
    'A fresh try! I love that.',
    'Changing your mind is part of thinking.',
    'Back we go. Take your time!',
    'Absolutely, it is your game!',
    'No judgment here. Try again!'
  ],

  // ------------------------------------------------------------------ the end of a game
  youWin: [
    'You did it! Congratulations, that was beautifully played!',
    'Bravo! You played wonderfully. I am so happy for you.',
    'What a victory! I enjoyed every move.',
    'You win! Take a bow, friend.',
    'Fantastic game! You really earned that.',
    'Well done! I would happily lose to you every time.',
    'Splendid! You make Othello look easy.',
    'Congratulations! A thrilling game.',
    'You have real talent, friend!',
    'Hip hip hooray! A rematch to celebrate?',
    'I am proud of you. That was great play!',
    'Brilliant win! Come back soon for more.'
  ],
  iWin: [
    'That was a great game! You made me work for it.',
    'Good game, friend! You played really well.',
    'I won this time, but it was such a close, lovely game.',
    'You were wonderful! Shall we go again?',
    'Thank you for the game! You are improving every time.',
    'Do not be disheartened. You had some really strong moves!',
    'Well played! Want to look over the game and see how it went?',
    'What a battle! You have got real spirit.',
    'Every game makes you stronger. Fancy another?',
    'Great effort! I had a lovely time.',
    'You gave me a proper challenge. Thank you!',
    'Win or lose, I loved playing you.'
  ],
  draw: [
    'A draw! What a perfectly balanced game.',
    'Honours even! You played so well.',
    'A tie! I could not have asked for a better match.',
    'Equal at the end. Now that is rare!',
    'Neither of us gave an inch. Lovely!',
    'A draw feels like a win for both of us.',
    'Even! Wonderful game, friend.',
    'We are a perfect match!'
  ],
  resigned: [
    'No worries, friend! Every game teaches us something. Fancy another?',
    'That is perfectly fine! Come back whenever you like.',
    'Thanks for playing! Shall we try again?',
    'Sometimes you just want a fresh start. Let us go again!',
    'No problem at all! I enjoyed it.',
    'Resigning is no shame. On to the next one!'
  ],
  endTwo: [
    'What a game, both of you! Well played!',
    'Congratulations to the winner, and well done to the other!',
    'A fine match between friends!',
    'Wonderful play from both sides!',
    'That is how it is done, you two! Rematch?',
    'Splendid. I enjoyed watching every move.'
  ],

  // ------------------------------------------------------------------ the review
  reviewGreat: [
    'Wow, you matched my favourite moves so often! Fantastic game.',
    'You play like a pro! Let us walk through it together.',
    'Look at that score! You should be very proud.',
    'Such good choices! I enjoyed this game so much.',
    'You have a real feel for Othello. Let us see the highlights!',
    'Impressive! Step through and enjoy your best moments.'
  ],
  reviewGood: [
    'A solid game with some lovely moves! Let us look at it together.',
    'You made plenty of good choices. Let us see the highlights!',
    'Nicely played! There are some great ideas in here.',
    'A good game! Step through it with me.',
    'You are on the right track. Let us explore the game!',
    'Lots to be proud of here. Shall we look?'
  ],
  reviewKind: [
    'Every game is a lesson, and you have plenty of good ideas. Let us explore!',
    'This is where the learning happens. I will be right beside you!',
    'Do not worry about the number. Every great player started right here.',
    'Let us look at it together. There are some real gems in there!',
    'You are improving with every game. Let us see how!',
    'A tricky game, but a useful one. Step through it with me!'
  ],
  reviewEmpty: [
    'Not many moves to look at this time, but let us step through anyway!',
    'A short game! Come and play another, I will be waiting.',
    'Nothing much to judge here. Let us play again soon!'
  ],
  reviewStart: [
    'Here is the start of the game. Press the arrow to step through!',
    'Let us replay the game, move by move. Ready?',
    'Use the arrows to walk through it. I will comment as we go!'
  ],
  reviewBest: [
    'Perfect! That is exactly what I would play.',
    'Spot on. What a move!',
    'Bravo, that was the best move there!',
    'A star move! I love it.',
    'You found my favourite! Great eye.',
    'Excellent! Textbook.',
    'Nailed it!',
    'Great minds think alike.',
    'Beautiful. Simply the best choice.',
    'That is the one. Well done!',
    'You are a natural.',
    'Yes! Exactly right.'
  ],
  reviewGoodMove: [
    'A good move, really solid!',
    'Nice! That is one of my top choices too.',
    'Well chosen. I would happily play that.',
    'A strong choice, friend.',
    'Good thinking, right up there with my favourites.',
    'Lovely. You are on the right track.',
    'That is a sensible, confident move.',
    'I like that one!',
    'Very respectable. Well done.',
    'A fine idea.',
    'Good instincts here!',
    'Solid and sound.'
  ],
  reviewMiss: [
    'Not quite my top pick, but a perfectly understandable move! Peek at the numbers for another idea.',
    'Close! Here is another thought you might enjoy.',
    'No worries, this is where we learn. Take a look at the suggestions.',
    'A creative choice! Let us see what else was there.',
    'I would have tried something different here, but that is how we improve.',
    'Everyone misses these. See what the badges suggest!',
    'An honest try, and now you know a new idea.',
    'Good thinking, with a better option nearby.',
    'That is one to remember for next time. You are improving all the time!',
    'Do not be hard on yourself. This position was tricky.',
    'Interesting! The glowing numbers show another path.',
    'A learning moment, and you are doing great.',
    'There was a stronger move hiding there, but nicely tried.',
    'A small slip, the kind every player makes!'
  ],
  reviewForced: [
    'Only one move there. Nothing to worry about!',
    'No choice at all, so no pressure!',
    'That one was forced. Easy!',
    'Just one legal move, and you handled it perfectly.',
    'Forced, but well done anyway!',
    'Nothing else to play there, friend.'
  ],
  reviewMine: [
    'That was my move there. I hoped you would answer well!',
    'I played here. Your reply was lovely, wasn’t it?',
    'My move. I enjoyed this moment of the game.',
    'Here I tried something. Let us see what you did next!',
    'That is me. Keep stepping, the good bits are coming!',
    'A move of mine. You handled it so well.'
  ],
  reviewPass: [
    'A pass here. It is all part of the game!',
    'Nobody could move, so the turn just carried on.',
    'No legal move there. Nothing to worry about!'
  ]
} satisfies Record<string, string[]>;

export type PoolName = keyof typeof POOLS;

/** Total number of lines, for the curious (and for a test that guards the pools stay large). */
export const POOL_SIZE = Object.values(POOLS).reduce((n, p) => n + p.length, 0);
