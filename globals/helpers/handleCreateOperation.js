// req.body: { operation_type, created_by }

const handleCreateOperation = async (req, res) => {
  const { operation_type, created_by = 1 } = req.body

  await res.connection.query(createOperation(), [operation_type, created_by])
  const operation_id = await res.connection.geLastInsertId()

  return {
    req: { ...req, body: { ...req.body, operation_id } },
    res: { ...res, statusCode: 201, data: { operation_id }, message: 'Operacion creada exitosamente' },
  }
}

const createOperation = () => `INSERT INTO operations (operation_type, created_by) VALUES(?, ?)`

module.exports = handleCreateOperation
