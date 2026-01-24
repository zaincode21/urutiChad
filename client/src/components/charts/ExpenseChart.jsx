import React from 'react';
import TranslatedText from '../TranslatedText';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#06B6D4', '#F97316', '#84CC16',
  '#EC4899', '#6366F1', '#14B8A6', '#F43F5E'
];

const CustomTooltip = ({ active, payload, label, formatCurrency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency ? formatCurrency(entry.value, 'RWF') : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ExpenseChart = ({
  type = 'bar',
  data,
  title,
  subtitle,
  height = 300,
  formatCurrency,
  showLegend = true,
  xAxisDataKey = 'name',
  yAxisDataKey = 'totalRwf',
  secondaryDataKey,
  stacked = false,
  area = false
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-500">{subtitle || <TranslatedText text="No data available" />}</p>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yAxisDataKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
          </PieChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisDataKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
            <Line
              type="monotone"
              dataKey={yAxisDataKey}
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            />
            {secondaryDataKey && (
              <Line
                type="monotone"
                dataKey={secondaryDataKey}
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisDataKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
            <Area
              type="monotone"
              dataKey={yAxisDataKey}
              stackId={stacked ? "1" : undefined}
              fill="#3B82F6"
              stroke="#3B82F6"
              fillOpacity={0.6}
            />
            {secondaryDataKey && (
              <Area
                type="monotone"
                dataKey={secondaryDataKey}
                stackId={stacked ? "1" : undefined}
                fill="#EF4444"
                stroke="#EF4444"
                fillOpacity={0.6}
              />
            )}
          </AreaChart>
        );

      default: // bar chart
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisDataKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
            <Bar
              dataKey={yAxisDataKey}
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
            {secondaryDataKey && (
              <Bar
                dataKey={secondaryDataKey}
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {showLegend && type === 'pie' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseChart;
