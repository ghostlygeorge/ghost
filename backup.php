<?php
$retvar = NULL;
$output = NULL;
$dd = date("Y-m-d");
print<<<_EOF_
	<form method="GET" action="./backups/athena{$dd}.sql.gz">
		<input background=#008080 value="Download File" type="submit">
		<br><br><br>
		===========================Displaying Dump ===============================
		<br><br>
	</form>
_EOF_;
$command ="/opt/lampp/bin/mysqldump  -uathena -psysadminharryk -hlocalhost  athena | gzip > /opt/lampp/htdocs/backups/athena".$dd.".sql.gz";
$command2 ="/opt/lampp/bin/mysqldump  -uathena -psysadminharryk -hlocalhost  athena > /opt/lampp/htdocs/backups/athena.txt";
exec($command2);
$filed = fopen("/opt/lampp/htdocs/backups/athena.txt","r") ;
while(!feof($filed)){
	print fgets($filed)."<br>";
}
fclose($filed);
exec($command,$output,$retvar);
if($retvar){
	print $retvar;
	print $output;
}
?>

