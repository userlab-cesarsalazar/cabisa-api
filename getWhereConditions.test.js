const { getWhereConditions } = require('./layers/lib')

test('get where conditions', () => {
  expect(
    getWhereConditions({
      fields: { id: 5 },
      hasPreviousConditions: false,
    })
  ).toMatch(/\s* WHERE\s* id\s* =\s* '5'\s*/i)
})
