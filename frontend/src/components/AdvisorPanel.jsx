import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Badge, Alert, Spinner, Button } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const AdvisorPanel = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdvisorData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/advisor');
        setRecommendations(response.data.recommendations);
        setPredictions(response.data.market_predictions);
        setLoading(false);
      } catch (err) {
        setError('Failed to load advisor data');
        setLoading(false);
        console.error(err);
      }
    };

    fetchAdvisorData();
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'primary';
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div className="advisor-panel">
      <h2>AI Portfolio Advisor</h2>
      
      <Card className="mb-4">
        <Card.Header>
          <h4>Recommendations</h4>
        </Card.Header>
        <Card.Body>
          {recommendations.length === 0 ? (
            <p>No recommendations at this time.</p>
          ) : (
            recommendations.map((rec, index) => (
              <Alert key={index} variant={getSeverityColor(rec.severity)}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <Badge bg={getSeverityColor(rec.severity)} className="me-2">
                      {rec.type.toUpperCase()}
                    </Badge>
                    {rec.message}
                  </div>
                  {rec.ticker && (
                    <Button size="sm" variant="outline-primary">
                      View {rec.ticker}
                    </Button>
                  )}
                </div>
              </Alert>
            ))
          )}
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header>
          <h4>Market Predictions</h4>
        </Card.Header>
        <Card.Body>
          {predictions.length === 0 ? (
            <p>No predictions available.</p>
          ) : (
            <>
              <div className="mb-4">
                <LineChart width={600} height={300} data={predictions.map(p => ({
                  name: p.ticker,
                  current: p.current_price,
                  predicted: p.predicted_price,
                  return: (p.expected_return * 100).toFixed(2)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="return" stroke="#8884d8" name="Expected Return (%)" />
                </LineChart>
              </div>
              
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Current Price</th>
                    <th>Predicted Price</th>
                    <th>Expected Return</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred, index) => (
                    <tr key={index}>
                      <td>{pred.ticker}</td>
                      <td>${pred.current_price.toFixed(2)}</td>
                      <td>${pred.predicted_price.toFixed(2)}</td>
                      <td className={pred.expected_return > 0 ? 'text-success' : 'text-danger'}>
                        {(pred.expected_return * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdvisorPanel;
