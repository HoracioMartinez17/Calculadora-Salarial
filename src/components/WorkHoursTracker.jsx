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
  InputNumber,
  Form,
} from "antd";
import { DeleteOutlined, SettingOutlined } from "@ant-design/icons";
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

  // Cargar configuraciones personalizadas desde localStorage o usar valores predeterminados
  const [contractConfig, setContractConfig] = useState(() => {
    const savedConfig = localStorage.getItem("workHoursConfig");
    return savedConfig
      ? JSON.parse(savedConfig)
      : {
          contractHoursPerMonth: 40, // Valor predeterminado: 40h
          hourlyRate: 7.65, // Valor predeterminado: 7.65€
          extraHourlyRate: 9, // Valor predeterminado: 9€
        };
  });

  const [showConfigForm, setShowConfigForm] = useState(false);

  // Guardar entradas en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem("workHoursEntries", JSON.stringify(entries));
  }, [entries]);

  // Guardar configuración en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem("workHoursConfig", JSON.stringify(contractConfig));
  }, [contractConfig]);

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
    setForm({ date: "", start: "14:00", end: "18:00" });
  };

  const deleteEntry = (key) => {
    setEntries((prevEntries) => prevEntries.filter((entry) => entry.key !== key));
    message.success("Entrada eliminada correctamente");
  };

  const updateConfig = (values) => {
    setContractConfig({
      contractHoursPerMonth: values.contractHoursPerMonth,
      hourlyRate: values.hourlyRate,
      extraHourlyRate: values.extraHourlyRate,
    });
    setShowConfigForm(false);
    message.success("Configuración guardada correctamente");
  };

  // Cálculos para el resumen
  const totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);

  // Calcular horas extras como el total menos las contratadas mensualmente
  const totalExtraHours = Math.max(0, totalHours - contractConfig.contractHoursPerMonth);

  // Calcular el pago de horas normales (limitado a las horas contratadas)
  const regularHours = Math.min(totalHours, contractConfig.contractHoursPerMonth);
  const regularPay = regularHours * contractConfig.hourlyRate;

  // Calcular el pago de horas extras
  const extraPay = totalExtraHours * contractConfig.extraHourlyRate;

  // Calcular el pago total (horas normales + horas extras)
  const totalPay = regularPay + extraPay;

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
      `Contrato mensual: ${contractConfig.contractHoursPerMonth} horas.`,
      10,
      doc.autoTable.previous.finalY + 20
    );
    doc.text(
      `Tarifa normal: ${contractConfig.hourlyRate}€/h. Tarifa extra: ${contractConfig.extraHourlyRate}€/h`,
      10,
      doc.autoTable.previous.finalY + 30
    );
    doc.text(
      `Días trabajados: ${uniqueDaysWorked} días`,
      10,
      doc.autoTable.previous.finalY + 40
    );
    doc.text(
      `Horas trabajadas en total: ${formatHoursToHHMM(totalHours)}`,
      10,
      doc.autoTable.previous.finalY + 50
    );
    doc.text(
      `Horas regulares: ${formatHoursToHHMM(regularHours)} (€${regularPay.toFixed(2)})`,
      10,
      doc.autoTable.previous.finalY + 60
    );
    doc.text(
      `Horas extras: ${formatHoursToHHMM(totalExtraHours)} (€${extraPay.toFixed(2)})`,
      10,
      doc.autoTable.previous.finalY + 70
    );
    doc.text(
      `Pago Total: €${totalPay.toFixed(2)}`,
      10,
      doc.autoTable.previous.finalY + 80
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

      <Button
        icon={<SettingOutlined />}
        onClick={() => setShowConfigForm(!showConfigForm)}
        style={{ marginBottom: "16px" }}
      >
        Configuración
      </Button>

      {showConfigForm && (
        <Card
          title="Configuración de Contrato"
          style={{ marginBottom: "16px", width: "100%", boxSizing: "border-box" }}
        >
          <Form initialValues={contractConfig} onFinish={updateConfig} layout="vertical">
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="contractHoursPerMonth"
                  label="Horas contratadas al mes"
                  rules={[{ required: true, message: "Este campo es obligatorio" }]}
                >
                  <InputNumber min={0} step={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item
                  name="hourlyRate"
                  label="Tarifa hora normal (€)"
                  rules={[{ required: true, message: "Este campo es obligatorio" }]}
                >
                  <InputNumber
                    min={0}
                    step={0.01}
                    precision={2}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item
                  name="extraHourlyRate"
                  label="Tarifa hora extra (€)"
                  rules={[{ required: true, message: "Este campo es obligatorio" }]}
                >
                  <InputNumber
                    min={0}
                    step={0.01}
                    precision={2}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" htmlType="submit">
              Guardar Configuración
            </Button>
          </Form>
        </Card>
      )}

      <Space
        direction="vertical"
        size="middle"
        style={{ display: "flex", width: "100%", boxSizing: "border-box" }}
      >
        <Card style={{ width: "100%", boxSizing: "border-box", background: "#dbdabc" }}>
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
              <Button
                type="primary"
                onClick={addEntry}
                style={{
                  width: "100%",
                  backgroundColor: "#206655", // Cambia este color
                  borderColor: "#1c994c", // Asegúrate de cambiar también el borde
                }}
              >
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
          title={<span style={{ color: "#07250e" }}>Resumen</span>}
          bordered={false}
          style={{ background: "#e5e9b3", width: "100%", boxSizing: "border-box" }}
        >
          <Row gutter={[16, 8]} style={{ color: "#07250e" }}>
            <Col xs={24} md={12}>
              <Text strong style={{ color: "#07250e" }}>
                Contrato mensual:
              </Text>{" "}
              <span style={{ color: "#07250e" }}>
                {contractConfig.contractHoursPerMonth} horas
              </span>
            </Col>
            <Col xs={24} md={12}>
              <Text strong style={{ color: "#07250e" }}>
                Tarifas:
              </Text>{" "}
              <span style={{ color: "#07250e" }}>
                {contractConfig.hourlyRate}€/h (normal), {contractConfig.extraHourlyRate}
                €/h (extra)
              </span>
            </Col>
            <Col xs={24} md={12}>
              <Text strong style={{ color: "#07250e" }}>
                Días trabajados:
              </Text>{" "}
              <span style={{ color: "#07250e" }}>{uniqueDaysWorked} días</span>
            </Col>
            <Col xs={24} md={12}>
              <Text strong style={{ color: "#07250e" }}>
                Horas trabajadas en total:
              </Text>{" "}
              <span style={{ color: "#07250e" }}>{formatHoursToHHMM(totalHours)}</span>
            </Col>
            <Col xs={24} md={12}>
              <Text strong style={{ color: "#07250e" }}>
                Horas normales:
              </Text>{" "}
              <span style={{ color: "#07250e" }}>
                {formatHoursToHHMM(regularHours)} (€{regularPay.toFixed(2)})
              </span>
            </Col>
            <Col xs={24} md={12}>
              <Text strong style={{ color: "#07250e" }}>
                Horas extras trabajadas:
              </Text>{" "}
              <span style={{ color: "#07250e" }}>
                {formatHoursToHHMM(totalExtraHours)} (€{extraPay.toFixed(2)})
              </span>
            </Col>
            <Col xs={24}>
              <Text strong style={{ fontSize: "1.1em", color: "#12a534" }}>
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
