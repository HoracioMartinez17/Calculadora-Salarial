import React, { useState, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Space,
  Typography,
  message,
  Spin,
  Card,
  Row,
  Col,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getMonth, getYear, format } from "date-fns";

const { Title, Text } = Typography;

const WorkHoursTracker = () => {
  // Cargar entradas desde localStorage al inicio
  const [entries, setEntries] = useState(() => {
    const savedEntries = localStorage.getItem("workHoursEntries");
    return savedEntries ? JSON.parse(savedEntries) : [];
  });

  const [form, setForm] = useState({ date: "", start: "14:00", end: "18:00" });
  const [loading, setLoading] = useState(false);
  const contractHoursPerMonth = 40; // 10h semanales * 4 semanas = 40h mensuales
  const hourlyRate = 7.65;
  const extraHourlyRate = 9;

  // Guardar entradas en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem("workHoursEntries", JSON.stringify(entries));
  }, [entries]);

  const calculateHours = (start, end) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let totalMinutes = endH * 60 + endM - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    return parseFloat((totalMinutes / 60).toFixed(2));
  };

  const addEntry = () => {
    if (!form.date || !form.start || !form.end) {
      message.error("Todos los campos son obligatorios");
      return;
    }
    const hoursWorked = calculateHours(form.start, form.end);
    setEntries((prevEntries) => [
      ...prevEntries,
      { key: Date.now(), ...form, hoursWorked },
    ]);
    setForm({ date: "", start: "14:00", end: "18:00" }); // Mantener 14:00 como hora de entrada predeterminada
  };

  const deleteEntry = (key) => {
    setEntries((prevEntries) => prevEntries.filter((entry) => entry.key !== key));
    message.success("Entrada eliminada correctamente");
  };

  // Cálculos para el resumen
  const totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);

  // Calcular horas extras como el total menos las contratadas mensualmente
  const totalExtraHours = Math.max(0, totalHours - contractHoursPerMonth);
  const totalPay = totalExtraHours * extraHourlyRate;

  // Días únicos trabajados
  const uniqueDaysWorked = new Set(entries.map((entry) => entry.date)).size;

  // Función para convertir horas decimales a formato "hh:mm"
  const formatHoursToHHMM = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
  };

  const exportToPDF = () => {
    setLoading(true);
    const doc = new jsPDF();
    doc.text("Resumen de Horas Trabajadas", 10, 10);
    doc.autoTable({
      head: [["Fecha", "Entrada", "Salida", "Horas Trabajadas"]],
      body: entries.map((e) => [e.date, e.start, e.end, e.hoursWorked.toFixed(2)]),
    });

    // Agregar el resumen con el formato solicitado
    doc.text("Resumen:", 10, doc.autoTable.previous.finalY + 10);
    doc.text(
      `Contrato mensual: ${contractHoursPerMonth} horas.`,
      10,
      doc.autoTable.previous.finalY + 20
    );
    doc.text(
      `Días trabajados: ${uniqueDaysWorked} días`,
      10,
      doc.autoTable.previous.finalY + 30
    );
    doc.text(
      `Horas trabajadas en total: ${formatHoursToHHMM(totalHours)}`,
      10,
      doc.autoTable.previous.finalY + 40
    );
    doc.text(
      `Horas extras trabajadas: ${formatHoursToHHMM(totalExtraHours)}`,
      10,
      doc.autoTable.previous.finalY + 50
    );
    doc.text(
      `Pago Total: €${totalPay.toFixed(2)}`,
      10,
      doc.autoTable.previous.finalY + 60
    );

    doc.save("horas_trabajadas.pdf");
    setLoading(false);
  };

  const columns = [
    { title: "Fecha", dataIndex: "date" },
    { title: "Entrada", dataIndex: "start" },
    { title: "Salida", dataIndex: "end" },
    { title: "Horas", dataIndex: "hoursWorked", render: (value) => value.toFixed(2) },
    {
      title: "Acciones",
      key: "actions",
      render: (_, record) => (
        <Button
          type="danger"
          icon={<DeleteOutlined />}
          onClick={() => deleteEntry(record.key)}
          size="small"
        />
      ),
    },
  ];

  return (
    <div
      className="work-hours-container"
      style={{ width: "100%", padding: "5px", boxSizing: "border-box" }}
    >
      <Title
        level={2}
        style={{
          fontSize: "calc(1.2rem + 1vw)",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        Registro de Horas
      </Title>

      <Space
        direction="vertical"
        size="middle"
        style={{ display: "flex", width: "100%", boxSizing: "border-box" }}
      >
        <Card style={{ width: "100%", boxSizing: "border-box" }}>
          <Row gutter={[8, 16]}>
            <Col xs={24} sm={8}>
              <div style={{ marginBottom: "8px" }}>
                <label>Fecha:</label>
                <Input
                  placeholder="Fecha"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ marginBottom: "8px" }}>
                <label>Entrada:</label>
                <Input
                  placeholder="Hora Entrada"
                  type="time"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ marginBottom: "8px" }}>
                <label>Salida:</label>
                <Input
                  placeholder="Hora Salida"
                  type="time"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
            </Col>
            <Col xs={24} sm={4} style={{ display: "flex", alignItems: "flex-end" }}>
              <Button type="primary" onClick={addEntry} style={{ width: "100%" }}>
                Añadir
              </Button>
            </Col>
          </Row>
        </Card>

        <div
          className="table-responsive"
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <Table
            dataSource={entries}
            columns={columns}
            pagination={{ pageSize: 5, responsive: true, size: "small" }}
            size="small"
            scroll={{ x: true }}
            style={{ width: "100%" }}
          />
        </div>

        <Card
          title="Resumen"
          bordered={false}
          style={{ background: "#f5f5f5", width: "100%", boxSizing: "border-box" }}
        >
          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Text strong>Contrato mensual:</Text> {contractHoursPerMonth} horas
            </Col>
            <Col xs={24} md={12}>
              <Text strong>Días trabajados:</Text> {uniqueDaysWorked} días
            </Col>
            <Col xs={24} md={12}>
              <Text strong>Horas trabajadas en total:</Text>{" "}
              {formatHoursToHHMM(totalHours)}
            </Col>
            <Col xs={24} md={12}>
              <Text strong>Horas extras trabajadas:</Text>{" "}
              {formatHoursToHHMM(totalExtraHours)}
            </Col>
            <Col xs={24}>
              <Text strong style={{ fontSize: "1.1em" }}>
                Pago Total: €{totalPay.toFixed(2)}
              </Text>
            </Col>
          </Row>
        </Card>

        <Button
          onClick={exportToPDF}
          type="primary"
          disabled={loading}
          style={{ width: "100%" }}
        >
          {loading ? <Spin /> : "Exportar a PDF"}
        </Button>
      </Space>
    </div>
  );
};

export default WorkHoursTracker;
