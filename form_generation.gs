function createFullWorldCupForm() {
  var form = FormApp.create('World Cup 2026 Group Stage Predictions');
  form.setTitle('World Cup 2026 Group Stage Predictions')
      .setDescription('Complete your predictions for the group stage matches, let Alfie know if you need help with this.')
      .setCollectEmail(true);

  // Complete data extracted from the provided match schedule [cite: 176-327]
  var fullSchedule = [
    {date: "Thursday, 11 June 2026", matches: [
      {group: "Group A", home: "Mexico", away: "South Africa"},
    ]},
    {date: "Friday, 12 June 2026", matches: [
      {group: "Group A", home: "Korea Republic", away: "Czechia"},
      {group: "Group B", home: "Canada", away: "Bosnia and Herzegovina"},
    ]},
    {date: "Saturday, 13 June 2026", matches: [
      {group: "Group D", home: "USA", away: "Paraguay"},
      {group: "Group B", home: "Qatar", away: "Switzerland"},
      {group: "Group C", home: "Brazil", away: "Morocco"},
    ]},
    {date: "Sunday, 14 June 2026", matches: [
      {group: "Group C", home: "Haiti", away: "Scotland"},
      {group: "Group D", home: "Australia", away: "Turkiye"},
      {group: "Group E", home: "Germany", away: "Curaçao"},
      {group: "Group F", home: "Netherlands", away: "Japan"},
    ]},
    {date: "Monday, 15 June 2026", matches: [
      {group: "Group E", home: "Côte d'Ivoire", away: "Ecuador"},
      {group: "Group F", home: "Sweden", away: "Tunisia"},
      {group: "Group H", home: "Spain", away: "Cabo Verde"},
      {group: "Group G", home: "Belgium", away: "Egypt"},
      {group: "Group H", home: "Saudi Arabia", away: "Uruguay"},
    ]},
    {date: "Tuesday, 16 June 2026", matches: [
      {group: "Group G", home: "IR Iran", away: "New Zealand"},
      {group: "Group I", home: "France", away: "Senegal"},
      {group: "Group I", home: "Iraq", away: "Norway"},
      {group: "Group J", home: "Argentina", away: "Algeria"},
      {group: "Group J", home: "Austria", away: "Jordan"}
    ]},
    {date: "Wednesday, 17 June 2026", matches: [
      {group: "Group L", home: "Ghana", away: "Panama"},
      {group: "Group L", home: "England", away: "Croatia"},
      {group: "Group K", home: "Portugal", away: "Congo DR"},
      {group: "Group K", home: "Uzbekistan", away: "Colombia"}
    ]},
    {date: "Thursday, 18 June 2026", matches: [
      {group: "Group A", home: "Czechia", away: "South Africa"},
      {group: "Group B", home: "Switzerland", away: "Bosnia and Herzegovina"},
      {group: "Group B", home: "Canada", away: "Qatar"},
      {group: "Group A", home: "Mexico", away: "Korea Republic"}
    ]},
    {date: "Friday, 19 June 2026", matches: [
      {group: "Group C", home: "Brazil", away: "Haiti"},
      {group: "Group C", home: "Scotland", away: "Morocco"},
      {group: "Group D", home: "Türkiye", away: "Paraguay"},
      {group: "Group D", home: "USA", away: "Australia"}
    ]},
    {date: "Saturday, 20 June 2026", matches: [
      {group: "Group E", home: "Germany", away: "Côte d'Ivoire"},
      {group: "Group E", home: "Ecuador", away: "Curaçao"},
      {group: "Group F", home: "Netherlands", away: "Sweden"},
      {group: "Group F", home: "Tunisia", away: "Japan"}
    ]},
    {date: "Sunday, 21 June 2026", matches: [
      {group: "Group H", home: "Uruguay", away: "Cabo Verde"},
      {group: "Group H", home: "Spain", away: "Saudi Arabia"},
      {group: "Group G", home: "Belgium", away: "IR Iran"},
      {group: "Group G", home: "New Zealand", away: "Egypt"}
    ]},
    {date: "Monday, 22 June 2026", matches: [
      {group: "Group I", home: "Norway", away: "Senegal"},
      {group: "Group I", home: "France", away: "Iraq"},
      {group: "Group J", home: "Argentina", away: "Austria"},
      {group: "Group J", home: "Jordan", away: "Algeria"}
    ]},
    {date: "Tuesday, 23 June 2026", matches: [
      {group: "Group L", home: "England", away: "Ghana"},
      {group: "Group L", home: "Panama", away: "Croatia"},
      {group: "Group K", home: "Portugal", away: "Uzbekistan"},
      {group: "Group K", home: "Colombia", away: "Congo DR"}
    ]},
    {date: "Wednesday, 24 June 2026", matches: [
      {group: "Group C", home: "Scotland", away: "Brazil"},
      {group: "Group C", home: "Morocco", away: "Haiti"},
      {group: "Group B", home: "Switzerland", away: "Canada"},
      {group: "Group B", home: "Bosnia and Herzegovina", away: "Qatar"},
      {group: "Group A", home: "Czechia", away: "Mexico"},
      {group: "Group A", home: "South Africa", away: "Korea Republic"}
    ]},
    {date: "Thursday, 25 June 2026", matches: [
      {group: "Group E", home: "Curaçao", away: "Côte d'Ivoire"},
      {group: "Group E", home: "Ecuador", away: "Germany"},
      {group: "Group F", home: "Japan", away: "Sweden"},
      {group: "Group F", home: "Tunisia", away: "Netherlands"},
      {group: "Group D", home: "Turkiye", away: "USA"},
      {group: "Group D", home: "Paraguay", away: "Australia"}
    ]},
    {date: "Friday, 26 June 2026", matches: [
      {group: "Group I", home: "Norway", away: "France"},
      {group: "Group I", home: "Senegal", away: "Iraq"},
      {group: "Group G", home: "Egypt", away: "IR Iran"},
      {group: "Group G", home: "New Zealand", away: "Belgium"},
      {group: "Group H", home: "Cabo Verde", away: "Saudi Arabia"},
      {group: "Group H", home: "Uruguay", away: "Spain"}
    ]},
    {date: "Saturday, 27 June 2026", matches: [
      {group: "Group L", home: "Panama", away: "England"},
      {group: "Group L", home: "Croatia", away: "Ghana"},
      {group: "Group J", home: "Algeria", away: "Austria"},
      {group: "Group J", home: "Jordan", away: "Argentina"},
      {group: "Group K", home: "Colombia", away: "Portugal"},
      {group: "Group K", home: "Congo DR", away: "Uzbekistan"}
    ]}
  ];

  fullSchedule.forEach(function(day) {
    form.addSectionHeaderItem().setTitle(day.date);
    day.matches.forEach(function(match) {
      form.addMultipleChoiceItem()
          .setTitle("[" + match.group + "] " + match.home + " vs " + match.away)
          .setChoiceValues([
            'Home Win (' + match.home + ')',
            'Draw',
            'Away Win (' + match.away + ')'
          ])
          .setRequired(true);
    });
  });

  Logger.log('Form Created! Editor URL: ' + form.getEditUrl());
}