const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all assessment cycles
 * @returns {Promise<Array>} Array of assessment cycles
 */
async function getAssessmentCycles() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'assessment_cycles' }
    });
    
    if (!setting) {
      return [];
    }
    
    const cycles = JSON.parse(setting.value);
    return Array.isArray(cycles) ? cycles : [];
  } catch (error) {
    console.error('Error fetching assessment cycles:', error);
    return [];
  }
}

/**
 * Get the active assessment cycle (one marked as isActive: true)
 * @returns {Promise<Object|null>} The active cycle or null
 */
async function getActiveCycle() {
  try {
    const cycles = await getAssessmentCycles();
    return cycles.find(cycle => cycle.isActive) || cycles[0] || null; // Fallback to first if none marked active
  } catch (error) {
    console.error('Error fetching active cycle:', error);
    return null;
  }
}

/**
 * Get assessment exceptions
 * @returns {Promise<Array>} Array of exceptions
 */
async function getAssessmentExceptions() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'assessment_exceptions' }
    });
    
    if (!setting) {
      return [];
    }
    
    const exceptions = JSON.parse(setting.value);
    return Array.isArray(exceptions) ? exceptions : [];
  } catch (error) {
    console.error('Error fetching assessment exceptions:', error);
    return [];
  }
}

/**
 * Get the current assessment cycle setting (for backward compatibility)
 * @returns {Promise<Object|null>} The active cycle or null
 */
async function getAssessmentCycle() {
  return await getActiveCycle();
}

/**
 * Check if a given date is within the assessment cycle period
 * @param {Date} date - The date to check (defaults to today)
 * @param {Object} cycle - The assessment cycle configuration (optional, will fetch if not provided)
 * @returns {Promise<boolean>} True if within cycle, false otherwise
 */
async function isWithinCycle(date = new Date(), cycle = null) {
  if (!cycle) {
    cycle = await getAssessmentCycle();
  }
  
  if (!cycle || !cycle.startDate || !cycle.endDate) {
    // No cycle configured - allow by default
    return true;
  }
  
  const checkDate = new Date(date);
  const startDate = new Date(cycle.startDate);
  const endDate = new Date(cycle.endDate);
  
  // Set time to midnight for date-only comparison
  checkDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999); // End of day
  
  return checkDate >= startDate && checkDate <= endDate;
}

/**
 * Check if a given date is within the activation period
 * @param {Date} date - The date to check (defaults to today)
 * @param {Object} cycle - The assessment cycle configuration (optional, will fetch if not provided)
 * @returns {Promise<boolean>} True if within activation period, false otherwise
 */
async function isWithinActivationPeriod(date = new Date(), cycle = null) {
  if (!cycle) {
    cycle = await getAssessmentCycle();
  }
  
  if (!cycle) {
    return true; // No cycle configured - allow by default
  }
  
  // If no activation period is set, allow if within cycle
  if (!cycle.activationStartDate || !cycle.activationEndDate) {
    return await isWithinCycle(date, cycle);
  }
  
  const checkDate = new Date(date);
  const activationStart = new Date(cycle.activationStartDate);
  const activationEnd = new Date(cycle.activationEndDate);
  
  // Set time to midnight for date-only comparison
  checkDate.setHours(0, 0, 0, 0);
  activationStart.setHours(0, 0, 0, 0);
  activationEnd.setHours(23, 59, 59, 999); // End of day
  
  return checkDate >= activationStart && checkDate <= activationEnd;
}

/**
 * Check if an employee has an exception for the given date
 * @param {string} employeeSid - The employee SID
 * @param {Date} date - The date to check (defaults to today)
 * @returns {Promise<Object|null>} The exception object if found, null otherwise
 */
async function getEmployeeException(employeeSid, date = new Date()) {
  const exceptions = await getAssessmentExceptions();
  
  if (!exceptions || exceptions.length === 0) {
    return null;
  }
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  // Get employee data for group exception matching
  let employeeData = null;
  let needsEmployeeData = false;
  
  // Check if there are any group exceptions that might match
  const hasGroupExceptions = exceptions.some(exp => 
    exp.type === 'group' || (exp.groupType && exp.groupValue)
  );
  
  if (hasGroupExceptions && employeeSid) {
    needsEmployeeData = true;
    try {
      const employee = await prisma.$queryRawUnsafe(
        `SELECT sid, line_manager_sid, division, location, unit FROM employees WHERE sid = '${String(employeeSid).replace(/'/g, "''")}' LIMIT 1`
      );
      if (employee && employee.length > 0) {
        employeeData = employee[0];
      }
    } catch (error) {
      console.error('Error fetching employee data for exception check:', error);
    }
  }
  
  // Find exception for this employee (single or group)
  const exception = exceptions.find(exp => {
    // Check if date is within exception period
    const expStart = new Date(exp.startDate);
    const expEnd = new Date(exp.endDate);
    expStart.setHours(0, 0, 0, 0);
    expEnd.setHours(23, 59, 59, 999);
    
    if (checkDate < expStart || checkDate > expEnd) {
      return false; // Date not within exception period
    }
    
    // Check single employee exception
    if (exp.type === 'single' || (!exp.type && exp.employeeSid)) {
      return exp.employeeSid === employeeSid;
    }
    
    // Check group exception
    if (exp.type === 'group' || (exp.groupType && exp.groupValue)) {
      if (!employeeData) {
        return false; // Can't match group exception without employee data
      }
      
      const groupType = exp.groupType;
      const groupValue = exp.groupValue;
      
      switch (groupType) {
        case 'manager':
          return employeeData.line_manager_sid === groupValue;
        case 'division':
          return employeeData.division === groupValue;
        case 'location':
          return employeeData.location === groupValue;
        case 'unit':
          return employeeData.unit === groupValue;
        default:
          return false;
      }
    }
    
    return false;
  });
  
  return exception || null;
}

/**
 * Check if assessments can be created/activated for a given employee on a given date
 * @param {string} employeeSid - The employee SID (optional, for exception checking)
 * @param {Date} date - The date to check (defaults to today)
 * @returns {Promise<{allowed: boolean, reason: string|null, cycle: Object|null}>}
 */
async function canCreateOrActivateAssessment(employeeSid = null, date = new Date()) {
  const cycles = await getAssessmentCycles();
  
  // If no cycles are configured, allow by default
  if (!cycles || cycles.length === 0) {
    return {
      allowed: true,
      reason: null,
      cycle: null
    };
  }
  
  // Check if employee has an exception first (exceptions override cycles)
  if (employeeSid) {
    const exception = await getEmployeeException(employeeSid, date);
    if (exception) {
      // Check if date is within exception period
      const checkDate = new Date(date);
      const expStart = new Date(exception.startDate);
      const expEnd = new Date(exception.endDate);
      checkDate.setHours(0, 0, 0, 0);
      expStart.setHours(0, 0, 0, 0);
      expEnd.setHours(23, 59, 59, 999);
      
      if (checkDate >= expStart && checkDate <= expEnd) {
        return {
          allowed: true,
          reason: `Exception: ${exception.reason || 'Custom assessment period'}`,
          cycle: null,
          exception: exception
        };
      }
    }
  }
  
  // Check against all cycles - if date falls within any cycle, allow
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  for (const cycle of cycles) {
    if (!cycle.startDate || !cycle.endDate) continue;
    
    const cycleStart = new Date(cycle.startDate);
    const cycleEnd = new Date(cycle.endDate);
    cycleStart.setHours(0, 0, 0, 0);
    cycleEnd.setHours(23, 59, 59, 999);
    
    // Check if date is within this cycle
    if (checkDate >= cycleStart && checkDate <= cycleEnd) {
      // Check activation period if set
      if (cycle.activationStartDate && cycle.activationEndDate) {
        const activationStart = new Date(cycle.activationStartDate);
        const activationEnd = new Date(cycle.activationEndDate);
        activationStart.setHours(0, 0, 0, 0);
        activationEnd.setHours(23, 59, 59, 999);
        
        if (checkDate < activationStart || checkDate > activationEnd) {
          return {
            allowed: false,
            reason: `Assessment activation period for "${cycle.name}" is from ${cycle.activationStartDate} to ${cycle.activationEndDate}. Current date is outside this period.`,
            cycle: cycle
          };
        }
      }
      
      // Date is within cycle and activation period (if set)
      return {
        allowed: true,
        reason: null,
        cycle: cycle
      };
    }
  }
  
  // Date is not within any cycle
  const activeCycle = await getActiveCycle();
  if (activeCycle) {
    return {
      allowed: false,
      reason: `Current date is outside all configured assessment cycles. Active cycle "${activeCycle.name}" runs from ${activeCycle.startDate} to ${activeCycle.endDate}.`,
      cycle: activeCycle
    };
  }
  
  return {
    allowed: false,
    reason: 'Current date is outside all configured assessment cycles.',
    cycle: null
  };
}

/**
 * Get a user-friendly message about the current assessment cycle status
 * @returns {Promise<string>} Status message
 */
async function getCycleStatusMessage() {
  const cycles = await getAssessmentCycles();
  
  if (!cycles || cycles.length === 0) {
    return 'No assessment cycles are currently configured.';
  }
  
  const activeCycle = await getActiveCycle();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (activeCycle) {
    const startDate = new Date(activeCycle.startDate);
    const endDate = new Date(activeCycle.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    if (today < startDate) {
      return `Active assessment cycle "${activeCycle.name}" starts on ${activeCycle.startDate}.`;
    } else if (today > endDate) {
      return `Active assessment cycle "${activeCycle.name}" ended on ${activeCycle.endDate}.`;
    } else {
      let message = `Active assessment cycle: "${activeCycle.name}" (${activeCycle.startDate} to ${activeCycle.endDate})`;
      
      if (activeCycle.activationStartDate && activeCycle.activationEndDate) {
        const todayStr = today.toISOString().split('T')[0];
        const activationStart = new Date(activeCycle.activationStartDate);
        const activationEnd = new Date(activeCycle.activationEndDate);
        activationStart.setHours(0, 0, 0, 0);
        activationEnd.setHours(23, 59, 59, 999);
        
        if (today >= activationStart && today <= activationEnd) {
          message += ` - Activation period active (${activeCycle.activationStartDate} to ${activeCycle.activationEndDate})`;
        } else {
          message += ` - Activation period: ${activeCycle.activationStartDate} to ${activeCycle.activationEndDate}`;
        }
      }
      
      return message;
    }
  }
  
  return `There are ${cycles.length} assessment cycle(s) configured, but none is marked as active.`;
}

module.exports = {
  getAssessmentCycle, // Backward compatibility
  getAssessmentCycles,
  getActiveCycle,
  getAssessmentExceptions,
  isWithinCycle,
  isWithinActivationPeriod,
  getEmployeeException,
  canCreateOrActivateAssessment,
  getCycleStatusMessage
};

