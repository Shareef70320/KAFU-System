# KAFU System - Application Rules & Standards

**Created:** December 2024  
**Purpose:** Comprehensive rules and standards for consistent application development  
**Version:** 1.0.0

---

## 🎯 **Core Principles**

### 1. **Performance First**
- All user interactions should feel instant and responsive
- Minimize server requests and API calls
- Use client-side processing when possible

### 2. **Consistency Across Pages**
- Uniform user experience across all pages
- Consistent patterns for similar functionality
- Standardized component usage

### 3. **Data Integrity**
- Single source of truth for all data
- Proper database relationships and constraints
- Consistent data flow patterns

---

## 👤 **User Context & Authentication Rules**

### **RULE #2: User Context Must Persist Across Page Refreshes**

#### **Implementation Pattern:**
```javascript
// ✅ CORRECT: UserContext with localStorage persistence
export const UserProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem('userRole') || 'USER';
  });
  const [currentSid, setCurrentSid] = useState(() => {
    return localStorage.getItem('userSid') || 'defaultSid';
  });

  // Update localStorage when values change
  useEffect(() => {
    localStorage.setItem('userRole', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('userSid', currentSid);
  }, [currentSid]);
};
```

#### **Routing Pattern:**
```javascript
// ✅ CORRECT: Role-based routing with persistent context
const RoleBasedRedirect = () => {
  const { currentRole } = useUser();
  
  if (currentRole === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  } else if (currentRole === 'USER') {
    return <Navigate to="/user" replace />;
  } else {
    return <Navigate to="/user" replace />;
  }
};
```

#### **Key Requirements:**
- ✅ **Persistent State**: User role and SID must survive page refreshes
- ✅ **Role-Based Routing**: Default route must redirect based on current user role
- ✅ **No Role Switching**: Page refresh should maintain current user context
- ✅ **Fallback Behavior**: Default to USER role if no role is set
- ✅ **Cache Clearing**: Clear React Query cache when user changes

#### **Common Mistakes to Avoid:**
- ❌ **Hardcoded Defaults**: Don't hardcode 'ADMIN' as default role
- ❌ **Missing Persistence**: Don't forget localStorage integration
- ❌ **Wrong Redirects**: Don't redirect all users to admin dashboard
- ❌ **Cache Issues**: Don't forget to clear cache when user changes

---

## 🔍 **Search Functionality Rules**

### **RULE #1: All Search Features Must Use Client-Side Filtering**

#### **Implementation Pattern:**
```javascript
// ✅ CORRECT: Client-side filtering with useMemo
const filteredData = useMemo(() => {
  if (!data) return [];
  
  let filtered = data;
  
  // Search filter
  if (searchInput.trim()) {
    const searchLower = searchInput.toLowerCase();
    filtered = filtered.filter(item => 
      item.field1?.toLowerCase().includes(searchLower) ||
      item.field2?.toLowerCase().includes(searchLower) ||
      item.field3?.toLowerCase().includes(searchLower)
    );
  }
  
  // Additional filters
  if (selectedFilter) {
    filtered = filtered.filter(item => item.filterField === selectedFilter);
  }
  
  return filtered;
}, [data, searchInput, selectedFilter]);
```

#### **API Pattern:**
```javascript
// ✅ CORRECT: Single API call without search parameters
const { data: apiData } = useQuery({
  queryKey: ['data-key'],
  queryFn: () => api.get('/endpoint?page=1&limit=10000').then(res => res.data),
  keepPreviousData: true,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

#### **State Management:**
```javascript
// ✅ CORRECT: Single search input state
const [searchInput, setSearchInput] = useState(''); // No debouncing needed
```

#### **❌ FORBIDDEN Patterns:**
- Server-side search with API parameters
- Debounced search with useEffect
- Multiple API calls for filtering
- Page reloads during search

---

## 🗄️ **Database & Data Source Rules**

### **RULE #2: Single Source of Truth for Data**

#### **Data Source Mapping:**

| **Page/Feature** | **Primary Data Source** | **Related Data Sources** | **API Endpoint** |
|------------------|-------------------------|---------------------------|------------------|
| **Employee Management** | `employees` table | `assessor_competencies` (for assessor status) | `/api/employees` |
| **Competency Framework** | `competencies` table | `competency_levels`, `assessor_competencies` | `/api/competencies` |
| **Jobs Management** | `jobs` table | `job_competencies`, `employees` (for assignments) | `/api/jobs` |
| **Job-Competency Mapping** | `job_competencies` table | `jobs`, `competencies` | `/api/job-competencies` |
| **Assessor Management** | `assessor_competencies` table | `employees`, `competencies` | `/api/assessors` |
| **User Profile** | `employees` table | `job_competencies` (for JCP) | `/api/employees` |
| **Manager Dashboard** | `employees` table | `job_competencies`, `assessor_competencies` | `/api/employees` |

#### **Data Relationship Rules:**

##### **Employee Data:**
- **Primary**: `employees` table
- **JCP Status**: Check `job_competencies` table for job competency profiles
- **Assessor Status**: Check `assessor_competencies` table for assessor assignments
- **Manager Hierarchy**: Use `line_manager_sid` field for reporting structure

##### **Competency Data:**
- **Primary**: `competencies` table
- **Levels**: Always join with `competency_levels` table
- **Assessors**: Join with `assessor_competencies` for assessor information
- **Job Requirements**: Join with `job_competencies` for job mappings

##### **Job Data:**
- **Primary**: `jobs` table
- **Competency Requirements**: Join with `job_competencies` and `competencies`
- **Employee Assignments**: Filter `employees` by `job_code` field
- **JCP Status**: Check if job has competency mappings

### **RULE #3: Consistent Data Fetching Patterns**

#### **Standard Query Pattern:**
```javascript
// ✅ CORRECT: Standard data fetching
const { data: primaryData, isLoading, error } = useQuery({
  queryKey: ['primary-data'],
  queryFn: () => api.get('/api/endpoint?page=1&limit=10000').then(res => res.data),
  retry: 1,
  keepPreviousData: true,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Related data fetching
const { data: relatedData } = useQuery({
  queryKey: ['related-data'],
  queryFn: () => api.get('/api/related-endpoint').then(res => res.data),
  retry: 1,
});
```

#### **Data Processing Pattern:**
```javascript
// ✅ CORRECT: Process data after fetching
const processedData = useMemo(() => {
  if (!primaryData) return [];
  
  return primaryData.map(item => ({
    ...item,
    // Add computed fields
    hasJCP: checkJCPStatus(item),
    isAssessor: checkAssessorStatus(item),
    // Add related data
    relatedInfo: getRelatedInfo(item, relatedData)
  }));
}, [primaryData, relatedData]);
```

---

## 🎨 **UI/UX Consistency Rules**

### **RULE #4: Consistent Search Input Design**

#### **Search Input Pattern:**
```jsx
// ✅ CORRECT: Standard search input
<Input
  ref={searchInputRef}
  id="search"
  key="search-input"
  placeholder="Search by name, email, or ID..."
  value={searchInput}
  onChange={(e) => setSearchInput(e.target.value)}
  className="pl-10"
  autoComplete="off"
/>
```

#### **Search Icon Pattern:**
```jsx
// ✅ CORRECT: Search icon with proper positioning
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
  <Input ... />
</div>
```

### **RULE #5: Consistent Filter Design**

#### **Filter Dropdown Pattern:**
```jsx
// ✅ CORRECT: Standard filter dropdown
<select
  value={selectedFilter}
  onChange={(e) => setSelectedFilter(e.target.value)}
  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="">All Items</option>
  {filterOptions.map(option => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>
```

---

## 🔧 **Component Architecture Rules**

### **RULE #6: Reusable Component Usage**

#### **Employee Photo Component:**
```jsx
// ✅ CORRECT: Always use EmployeePhoto component
<EmployeePhoto
  sid={employee.sid}
  firstName={employee.first_name}
  lastName={employee.last_name}
  size="medium"
/>
```

#### **Status Icons Pattern:**
```jsx
// ✅ CORRECT: Consistent icon usage
{hasJCP(employee) && (
  <Award className="h-4 w-4 text-amber-500 flex-shrink-0" title="Has Job Competency Profile" />
)}
{isAssessor(employee.sid) && (
  <UserCheck className="h-4 w-4 text-green-600 flex-shrink-0" title="Assessor - Can evaluate competencies" />
)}
```

### **RULE #7: Modal and Dialog Patterns**

#### **Standard Modal Structure:**
```jsx
// ✅ CORRECT: Standard modal pattern
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-xl font-semibold">Modal Title</h2>
        <button onClick={() => setShowModal(false)}>
          <X className="h-6 w-6" />
        </button>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Modal content */}
      </div>
      
      {/* Footer */}
      <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
        <Button variant="outline" onClick={() => setShowModal(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Save
        </Button>
      </div>
    </div>
  </div>
)}
```

---

## 📊 **Data Display Rules**

### **RULE #8: Consistent Data Display Patterns**

#### **Card Layout Pattern:**
```jsx
// ✅ CORRECT: Standard card layout
<Card key={item.id} className="hover:shadow-lg transition-shadow duration-200">
  <CardContent className="p-4">
    <div className="flex items-start space-x-4">
      {/* Left side - Image/Avatar */}
      <div className="flex-shrink-0">
        <ItemPhoto ... />
      </div>
      
      {/* Right side - Details */}
      <div className="flex-1 min-w-0">
        {/* Header with name and status icons */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {item.name}
            </h3>
            {/* Status icons */}
          </div>
        </div>
        
        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {/* Item details */}
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

#### **Statistics Display Pattern:**
```jsx
// ✅ CORRECT: Standard statistics cards
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Users className="h-6 w-6 text-blue-600" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## 🚀 **Performance Rules**

### **RULE #9: Performance Optimization Requirements**

#### **Required Optimizations:**
- **useMemo**: For all filtered data calculations
- **useCallback**: For event handlers passed to child components
- **keepPreviousData**: For all useQuery calls
- **staleTime**: Minimum 5 minutes for cached data
- **Client-side filtering**: For all search functionality

#### **Memory Management:**
- Clean up event listeners in useEffect cleanup
- Avoid memory leaks in component unmounting
- Use proper dependency arrays in hooks

---

## 🔒 **Error Handling Rules**

### **RULE #10: Consistent Error Handling**

#### **API Error Pattern:**
```javascript
// ✅ CORRECT: Standard error handling
const { data, isLoading, error } = useQuery({
  queryKey: ['data'],
  queryFn: () => api.get('/endpoint').then(res => res.data),
  retry: 1,
  onError: (error) => {
    toast({
      title: "Error",
      description: "Failed to load data. Please try again.",
      variant: "destructive",
    });
  }
});

if (error) {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Failed to load data</p>
      </div>
    </div>
  );
}
```

---

## 📝 **Code Quality Rules**

### **RULE #11: Code Organization Standards**

#### **File Structure:**
```
src/pages/PageName.js
├── Imports (React, hooks, components, icons)
├── Component definition
├── State variables
├── Data fetching (useQuery)
├── Helper functions
├── Event handlers
├── Filtering logic (useMemo)
├── Render logic
└── JSX return
```

#### **Naming Conventions:**
- **Components**: PascalCase (e.g., `EmployeeManagement`)
- **Functions**: camelCase (e.g., `handleSearchInput`)
- **Variables**: camelCase (e.g., `filteredEmployees`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_ITEMS_PER_PAGE`)

---

## 🧪 **Testing Rules**

### **RULE #12: Testing Requirements**

#### **Required Test Coverage:**
- Search functionality works correctly
- Filters work independently and together
- Data displays correctly from proper sources
- Error states are handled gracefully
- Performance is maintained with large datasets

---

## 📋 **Implementation Checklist**

### **For Every New Page with Search:**
- [ ] Implement client-side filtering with useMemo
- [ ] Use single API call without search parameters
- [ ] Add proper search input with ref and focus management
- [ ] Include comprehensive search across relevant fields
- [ ] Test with large datasets (1000+ items)
- [ ] Verify no page reloads during search

### **For Every Data Display:**
- [ ] Use correct primary data source
- [ ] Include related data from proper tables
- [ ] Implement consistent card layout
- [ ] Add appropriate status icons
- [ ] Include proper error handling
- [ ] Test data relationships

### **For Every Component:**
- [ ] Follow naming conventions
- [ ] Use reusable components where possible
- [ ] Implement proper error states
- [ ] Add loading states
- [ ] Ensure responsive design
- [ ] Test accessibility

---

## 🎯 **Success Metrics**

### **Performance Targets:**
- Search response time: < 100ms
- Page load time: < 2 seconds
- API response time: < 500ms
- Memory usage: Stable (no leaks)

### **User Experience Targets:**
- Zero page reloads during search
- Consistent UI across all pages
- Intuitive navigation and interactions
- Clear error messages and feedback

---

## 📚 **Documentation Requirements**

### **For Every Feature:**
- [ ] Document data sources and relationships
- [ ] Explain search and filter functionality
- [ ] Include performance considerations
- [ ] Document any special requirements
- [ ] Update this rules file if new patterns emerge

---

**Last Updated:** December 2024  
**Next Review:** When new patterns or requirements are identified

---

## 🚨 **Critical Reminders**

1. **NEVER** use server-side search with API parameters
2. **ALWAYS** use client-side filtering with useMemo
3. **ALWAYS** use the correct data source for each page
4. **ALWAYS** maintain consistent UI patterns
5. **ALWAYS** test with large datasets
6. **ALWAYS** follow the established component patterns

**Remember:** Consistency is key to maintainable, scalable applications! 🎉
