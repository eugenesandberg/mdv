import glob
from netCDF4 import Dataset
import sys

salinityFile="C:\\DEV\\apache-tomcat-9.0.37\\webapps\\windy\\public_html\\data\\sgdemv3s"
temperatureFile="C:\\DEV\\apache-tomcat-9.0.37\\webapps\\windy\\public_html\\data\\tgdemv3s"
allFileExt=".nc"

##lonArg = -116.34196874998302
##latArg = -12.804818894771783
##fileArg = "01"

lonArg = float(sys.argv[1])
latArg = float(sys.argv[2])
fileArg = sys.argv[3]

#convert 180 to 360
lonArg = lonArg%360


#salArray = [[]]


# returns the netCDF index value for the nearest cell
def getClosestValue(val, Var):

  #This is Sal's code, but I found a slightly cleaner method
    # Squared difference of value
##    sq_diff_val = (Var - val)**2

    
##    print(val,"<br/>")
##    print("Var :: ",Var,"<br/>")
##    print("(Var - val)**2 :: ",(Var - val)**2,"<br/>")
##    print("sq_diff_val.argmin() :: ",sq_diff_val.argmin(),"<br/>")
    
    # return the index of the minimum value
##    return sq_diff_val.argmin()


##    print(val)
##    #val = getGDEMQuarterDegree(val)
##    print(val)
##    print("Var :: ",Var)
##    print("abs(Var - val) :: ",abs(Var - val))
##    print("val,abs(Var - val).argmin() :: ",val,abs(Var - val).argmin())

    # pulled this from https://stackoverflow.com/questions/45582344/extracting-data-from-netcdf-by-python
    return abs(Var - val).argmin()


def getGDEMQuarterDegree(val):
    if "." in str(val):
        rounder = 0 #might need to round up the hundreths place
        val = str(val).split(".")
        valDeg = val[0]
        if len(val[1])>2: #if there is a thousandths place, rest if for rounding
            if int(val[1][2:3])>4:
                rounder = 1
        if len(val[1])<2: #if there is no hundreths place, make one because we need it!
            val[1] = val[1]+"0"
            
        valDec = str(int((int(val[1][:2])+rounder)/25)*25)
        #print ("valDec: ",val[1][:2],int(valDec/25)*25)
        if valDec != "0":
            val = float(valDeg+"."+valDec)
        else:
            val = int(valDeg)
    else:
        pass # congrats! you hit the lotto and hit a degree on the head

    return val
    
def get_variable_dict(fileName,variable):
    varDict = {};
    #print (fileName,", ",variable)
    if fileName != "":
        for file in glob.iglob(fileName):
            
            # Reading in the netCDF file
            data = Dataset(file,"r")    
                
            latVar = data.variables['lat'][:]
            lonVar = abs(data.variables['lon'][:])
            depthVar = data.variables['depth']
            depthIndex = -1
##            print ("data.variables['lat']\n",data.variables['lat'])
            closestLon = getClosestValue(lonArg, lonVar) #X
            closestLat = getClosestValue(latArg, latVar) #Y
            #closestLon = getGDEMQuarterDegree(lonArg) #X
            #closestLat = getGDEMQuarterDegree(latArg) #Y
            #print ("lonArg quarter: ",getGDEMQuarterDegree(lonArg))
            #print ("latArg quarter: ",getGDEMQuarterDegree(latArg))

##            if closestLon < 0:
##                closestLon = (closestLon-180)*-1
##            print ("latArg:: ",latArg," closestLat:: ",closestLat)
##            print ("lonArg:: ",lonArg," closestLon:: ",closestLon)
##            print (data.variables[variable][1,closestLat,closestLon])
            
            for depth in depthVar:
                
                depthIndex += 1   
                searchVar = data.variables[variable]
                
                searchVar = searchVar[depthIndex,closestLat,closestLon]
            
                if (searchVar != '--'):
                    
                    #if (depthIndex !=0):
                        #content +=','
                       # print(',')
                    depth = depthVar[depthIndex]
                    #salArray.insert(depthIndex,[depth,searchVar])
                    #print("*********************")
                    #print("   Depth = ",depth,depthVar.units)
                    #print("Salinity = ",salinity,searchVar.units)
                    #content +='{"depth":',str(depth),',"salinity":',str(salinity),'}'
                    varDict[str(depth)] = str(searchVar)
    return varDict
    
def convert_dict_to_d3_ready_array(profileDict):
    d3Arr = []
    for v in profileDict:
        for d in profileDict[v]:
            #print(str(v)+" at "+str(d)+"m as float: "+str(float(profileDict[v][d]))+" as regular: "+profileDict[v][d])
            d3Arr.append({"variable":str(v),"depth":float(d),"value":float(profileDict[v][d])})
    return d3Arr
    
def convert_dict_to_d3_ready_object(profileDict):
    d3Obj = {}
    for v in profileDict:
        d3Obj[v]=[]
        for d in profileDict[v]:
            #print(str(v)+" at "+str(d)+"m as float: "+str(float(profileDict[v][d]))+" as regular: "+profileDict[v][d])
            d3Obj[v].append({"variable":str(v),"depth":float(d),"value":float(profileDict[v][d])})
    return d3Obj
    
    
salinityFile = salinityFile+fileArg+allFileExt
temperatureFile = temperatureFile+fileArg+allFileExt

profileDict = {}
#content = '{"measurements":['
variables = ['sound_speed','salinity','water_temp']
files = ["",salinityFile,temperatureFile]
#var1 = 'salinity'
#var2 = 'water_temp'
#var3 = 'profile'
for v in variables:
    profileDict[v] =  get_variable_dict(files[variables.index(v)],v)

#profileDict[var2] =  get_variable_dict(temperatureFile,var2)
#profileDict[var3] = {}loop this and fail out if var is not in data

#sound speed constants from https://en.wikipedia.org/wiki/Speed_of_sound#Seawater
a1 = float(1448.96)
a2 = float(4.591)
a3 = float(-5.304*10**-2)
a4 = float(2.374 * 10**-4)
a5 = float(1.340)
a6 = float(1.630 * 10**-2)
a7 = float(1.675 * 10**-7)
a8 = float(-1.025 * 10**-2)
a9 = float(-7.139 * 10**-13)

for d in profileDict[variables[1]]:
    if d in profileDict[variables[2]]:
        T = float(profileDict[variables[2]][d])
        S = float(profileDict[variables[1]][d])
        #sound speed formula from https://en.wikipedia.org/wiki/Speed_of_sound#Seawater
        c = a1 + a2*T + a3*T**2 + a4*T**3 + a5*(S - 35) + a6*float(d) + a7*float(d)**2 + a8*T*(S - 35) + a9*T*float(d)**3
        profileDict[variables[0]][d] = c

#print(profileDict)
print(convert_dict_to_d3_ready_object(profileDict))
#print(convert_dict_to_d3_ready_array(profileDict))
