import { useState, useEffect, useRef, useCallback} from 'react';
import axios from 'axios';
import { Table, Popconfirm, Button, Space, Form, Input} from 'antd';
import { isEmpty } from 'lodash';
import { SearchOutlined } from '@ant-design/icons';
import Highlighter from 'react-highlight-words';
import {DndProvider, useDrag, useDrop} from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';
import update from 'immutability-helper';
import {CSVLink} from 'react-csv';


const DataTable = () => {
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editRowKey, setEditRowKey] = useState('');
  const [sortedInfo, setSortedInfo] = useState({});
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [searchColText, setSearchColText] = useState('');
  const [searchedCol, setSearchedCol] = useState('');
  let [filteredData] = useState();
  const [filteredInfo, setFilteredInfo] = useState({});
  const [showFilter, setShowFilter] = useState(true);
  const type = 'DraggableBodyRow';
  const tableRef = useRef();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const response = await axios.get('https://jsonplaceholder.typicode.com/comments');
    setGridData(response.data);
    setLoading(false);
  }
  const dataWithAge = gridData.map((item) => ({
    ...item,
    age: Math.floor(Math.random() * 6) + 20,
  }));

  const modifiedData = dataWithAge.map(({body, ...item }) =>({
    ...item,
    key: item.id,
    info: `name: ${item.email.split('@')[0]} and age ${item.age}`,
    message: isEmpty(body) ? item.message : body,
  }));



  const DraggableBodyRow = ({
    index,
    moveRow,
    className,
    style,
    ...restProps
  }) => {
    const ref = useRef();
    const [{isOver, dropClassName}, drop] = useDrop({
      accept: type,
      collect: (monitor) => {
        const {index: dragIndex} =  monitor.getItem() || {};
        if (dragIndex === index) {
          return {};
        }
        return {
          isOver: monitor.isOver(),
          dropClassName: dragIndex < index ? 'drop-down-downward' : 'drop-over-upward',
        };
      },
      drop: (item) => {
        moveRow(item.index, index);
      }
    });
    const [, drag] = useDrag({
      type,
      item: {index},
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    })
    drop(drag(ref));
    return (
      <tr
      ref={ref}
      className={`${className}${isOver ? dropClassName : ''}`}
      style={{cursor: 'move', ...style}}
      {...restProps}
      />
    )
  }

  const moveRow = useCallback((dragIndex, hoverIndex) => {
    const dragRow = modifiedData[dragIndex];
    setGridData(update(modifiedData, {
      $splice: [
        [dragIndex, 1],
        [hoverIndex, 0, dragRow]
      ]
    }))
  }, [modifiedData]);

  const handleDelete = (value) => {
    const dataSource = [...modifiedData];
    const filteredData = dataSource.filter((item) => item.id !== value.id);
    setGridData(filteredData);
  }
  const isEditing = (record) => {
    return record.key === editRowKey;
  }
  const edit = (record) => {
    form.setFieldsValue({
      name: '',
      email: '',
      message: '',
      ...record
    });
    setEditRowKey(record.key);
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...modifiedData];
      const index = newData.findIndex((item) => key === item.key);
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, {...item, ...row});
        setGridData(newData);
        setEditRowKey('');
      }
    } catch (error) {
        console.log('Error', error);
      }
  }
  const cancel = () => {
    setEditRowKey('');
  };

  const handleChange = (_, filter, sorter) => {
    const { order, field} = sorter;
    setFilteredInfo(filter);
    setSortedInfo({columnKey: field, order});
  };

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{padding: 8}}>
        <Input
        placeholder={`Search ${dataIndex}`}
        value={selectedKeys[0]}
        onChange={(e)=> setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={()=>handleSearchCol(selectedKeys, confirm, dataIndex)}
        style={{width: 188, marginBottom: 8, display: "block"}}
        />
        <Space style={{marginTop: 4}}>
          <Button
          type="primary"
          onClick={()=> handleSearchCol(selectedKeys, confirm, dataIndex)}
          icon={<SearchOutlined />}
          size="small"
          style={{width: 90}}
          >
            Search
          </Button>
          <Button
          type="primary"
          onClick={()=> handleResetCol(clearFilters)}
          size="small"
          style={{width: 90}}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{color: filtered ? '#1890ff': undefined}}/>
    ),
    onFilter: (value, record) =>
    record[dataIndex]
    ? record[dataIndex]
        .toString()
        .toLowerCase()
        .includes(value.toLowerCase())
        : '',
    render: (text) =>
    searchedCol === dataIndex ? (
      <Highlighter
      highlightStyle={{backgroundColor: "#ffc069", padding: 0}}
      searchWords={[searchColText]}
      autoEscape
      textToHighlight={text ? text.toString() : ''}
      />
    ) : (text)
  });

  const handleSearchCol = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setShowFilter(false);
    setSearchColText(selectedKeys[0]);
    setSearchedCol(dataIndex);
  };

  const handleResetCol = (clearFilters) => {
    clearFilters();
    setSearchColText('');
    setShowFilter(true);
  };

  const filterObject = {
    filters: [
      {text: '20', value: '20'},
      {text: '21', value: '21'},
      {text: '22', value: '22'},
      {text: '23', value: '23'},
      {text: '24', value: '24'},
      {text: '25', value: '25'},
    ],
    filteredValue: filteredInfo.age || null,
    onFilter: (value, record) => String(record.age).includes(value),
  }
  const showFilterAge = showFilter ? filterObject : null;

  const  columns = [
  {
    title: "ID",
    dataIndex: "id"
  },
  {
    title: "Name",
    dataIndex: "name",
    align: "center",
    editTable: true,
    sorter: (a, b) => a.name.localeCompare(b.name),
    sortOrder: sortedInfo.columnKey === 'name' && sortedInfo.order,
    ...getColumnSearchProps("name")
  },
  {
    title: "Email",
    dataIndex: "email",
    align: "center",
    editTable: true,
    sorter: (a, b) => a.email.length - b.email.length,
    sortOrder: sortedInfo.columnKey === 'email' && sortedInfo.order,
    ...getColumnSearchProps("email")
  },
  {
    title: "Age",
    dataIndex: "age",
    align: "center",
    editTable: false,
    sorter: (a, b) => a.age - b.age,
    sortOrder: sortedInfo.columnKey === 'age' && sortedInfo.order,
    ...showFilterAge,
  },
  {
    title: "Message",
    dataIndex: "message",
    align: "center",
    editTable: true,
    sorter: (a, b) => a.message.length - b.message.length,
    sortOrder: sortedInfo.columnKey === 'message' && sortedInfo.order,
    ...getColumnSearchProps("message")
  },
  {
    title: "Action",
    dataIndex: "action",
    align: "center",
    render: (_, record) => {
      const editable = isEditing(record);
    return modifiedData.length >= 1  ? (
      <Space>
      <Popconfirm
      title="Sure to delete?"
      onConfirm={() => handleDelete(record)}
      >
      <Button danger type="primary" disabled={editable}
      >Delete
      </Button>
      </Popconfirm>
      {editable ? (
      <span>
        <Space size="middle">
          <Button
            onClick={(e) => save(record.key)}
            type="primary"
            style={{marginRight: 8}}
            >Save
          </Button>
        <Popconfirm
            title="Are you sure to cancel?"
            onConfirm={cancel}
            >
            <Button>Cancel</Button>
        </Popconfirm>
        </Space>
      </span>) : (
        <Button onClick={()=> edit(record)} type="primary">
          Edit
        </Button>
      )}
      </Space>
    ) : null;
   }
  }
];

const reset = () => {
  setSortedInfo({});
  setFilteredInfo({});
  setSearchText('');
  loadData();
}
const mergedColumns = columns.map((col)=>{
  if (!col.editTable) {
    return col;
  }
  return {
    ...col,
    onCell: (record) => ({
      record,
      dataIndex: col.dataIndex,
      title: col.title,
      editing: isEditing(record),
    }),
  };
});
const EditableCell = ({
  editing,
  dataIndex,
  title,
  record,
  children,
  ...restProps
}) => {
  const input = <Input />;
  return (
    <td {...restProps}>
   {editing ? (
    <Form.Item
    name={dataIndex}
    style={{
      margin: 0,
    }}
    rules = {[
      {
        required: true,
        message: `Please enter some value for ${title} field`
      },
    ]}
    >
      {input}
    </Form.Item>
   ) : (
    children
   )}
    </td>
  );
};
const handleInputChange = (e) => {
  setSearchText(e.target.value);
  if (e.target.value === '') {
    loadData();
  }
};

const globalSearch = () => {
  filteredData = modifiedData.filter((value) => {
    return (
      value.name.toLowerCase().includes(searchText.toLowerCase()) ||
      value.email.toLowerCase().includes(searchText.toLowerCase()) ||
      value.message.toLowerCase().includes(searchText.toLowerCase())
    );
  });
  setGridData(filteredData);
};

  return (
    <>
      <Space style={{marginBottom: 16}}>
        <Input
        placeholder="I'm searching ..."
        onChange={handleInputChange}
        type="text"
        allowClear
        value={searchText}
        />
        <Button onClick={globalSearch} type="primary">Search</Button>
        <Button onClick={reset}>Reset</Button>
        <Button style={{backgroundColor: '#c2115e', color: '#fff'}}>
          <CSVLink data={filteredData && filteredData.length ? filteredData : modifiedData}>Export</CSVLink>
        </Button>
      </Space>
      <Form form={form} component={false}>
        <DndProvider backend={HTML5Backend}>
        <Table
        red={tableRef}
      components = {{
        body: {
          cell: EditableCell,
          row: DraggableBodyRow
        },
      }}
      onRow={(record, index) => ({
        index,
        moveRow
      })}
      columns={mergedColumns}
      dataSource={filteredData && filteredData.length ? filteredData : modifiedData}
      expandable={{
        expandedRowRender: (record) => (
          <p style={{margin: 0}}>{record.info}</p>
        ),
        rowExpandable: (record) => record.info !== 'Not Expandable'
      }}
      bordered
      loading={loading}
      onChange={handleChange}
      pagination={{position: ['bottomCenter']}}
      />
      </DndProvider>
      </Form>
    </>
  );
}

export default DataTable;
