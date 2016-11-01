<!DOCTYPE html>
<html>
<head>
<title>Testing</title>
</head>
<body>
	<?php
		require_once("user.php");

		$harry = new SysUser("Harry",32830604,+254702408103,"kituyiharry@gmail.com","Male","14-11-2010");
		$date = date("d-m-y",strtotime("today"));
		print $date ."\n" ;
		$reg = $harry->buildRegString(001);
		print $reg;
		print "\n";
		$harry->toHtml();
	?>
</body>
</html>
