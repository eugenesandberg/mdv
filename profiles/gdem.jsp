<%@ page import="java.io.*"%><%
String content = "";
 try {
    Runtime runtime = Runtime.getRuntime();
    //may be py or python - depends on computer system setup
    Process exec = runtime.exec("py C:/DEV/apache-tomcat-9.0.37/webapps/windy/public_html/profiles/getData.py "+request.getParameter("long")+" "+request.getParameter("lat")+" "+request.getParameter("file"));
    BufferedReader in = new BufferedReader(new InputStreamReader(exec.getInputStream()));
    String line;
    while ((line = in.readLine()) != null) {
        System.out.println(line);
		content += line;
    }
    exec.waitFor();
    in.close();
    } catch (InterruptedException e) {
      throw new RuntimeException(e);
    }

 %><%=content%>